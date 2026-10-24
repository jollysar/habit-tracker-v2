import AppKit
import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation

struct PreviewConfiguration {
    let width: Int
    let height: Int
    let output: URL
    let images: [CGImage]
}

enum PreviewError: Error, CustomStringConvertible {
    case usage
    case image(String)
    case pixelBuffer
    case writer(String)

    var description: String {
        switch self {
        case .usage:
            return "Usage: create-app-preview <width> <height> <output.mp4> <image1.png> ..."
        case .image(let path):
            return "Unable to load image: \(path)"
        case .pixelBuffer:
            return "Unable to create a video frame."
        case .writer(let message):
            return message
        }
    }
}

func loadCGImage(path: String) throws -> CGImage {
    guard let image = NSImage(contentsOfFile: path) else { throw PreviewError.image(path) }
    var rect = NSRect(origin: .zero, size: image.size)
    guard let result = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
        throw PreviewError.image(path)
    }
    return result
}

func smoothstep(_ value: CGFloat) -> CGFloat {
    let clamped = max(0, min(1, value))
    return clamped * clamped * (3 - 2 * clamped)
}

func draw(
    image: CGImage,
    in context: CGContext,
    width: Int,
    height: Int,
    progress: CGFloat,
    alpha: CGFloat
) {
    let zoom = 1 + 0.018 * progress
    let drawWidth = CGFloat(width) * zoom
    let drawHeight = CGFloat(height) * zoom
    let x = (CGFloat(width) - drawWidth) / 2
    let y = (CGFloat(height) - drawHeight) / 2
    context.saveGState()
    context.setAlpha(alpha)
    context.draw(image, in: CGRect(x: x, y: y, width: drawWidth, height: drawHeight))
    context.restoreGState()
}

func makeFrame(
    configuration: PreviewConfiguration,
    currentIndex: Int,
    nextIndex: Int,
    slideProgress: CGFloat,
    transitionProgress: CGFloat,
    pool: CVPixelBufferPool
) throws -> CVPixelBuffer {
    var optionalBuffer: CVPixelBuffer?
    guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer) == kCVReturnSuccess,
          let buffer = optionalBuffer else {
        throw PreviewError.pixelBuffer
    }

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let baseAddress = CVPixelBufferGetBaseAddress(buffer) else { throw PreviewError.pixelBuffer }
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
    guard let context = CGContext(
        data: baseAddress,
        width: configuration.width,
        height: configuration.height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: colorSpace,
        bitmapInfo: bitmapInfo
    ) else { throw PreviewError.pixelBuffer }

    context.setFillColor(CGColor(red: 0.957, green: 0.949, blue: 0.918, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: configuration.width, height: configuration.height))
    draw(
        image: configuration.images[currentIndex],
        in: context,
        width: configuration.width,
        height: configuration.height,
        progress: slideProgress,
        alpha: 1
    )
    if transitionProgress > 0 {
        draw(
            image: configuration.images[nextIndex],
            in: context,
            width: configuration.width,
            height: configuration.height,
            progress: 0,
            alpha: smoothstep(transitionProgress)
        )
    }
    return buffer
}

func render(_ configuration: PreviewConfiguration) throws {
    let fileManager = FileManager.default
    if fileManager.fileExists(atPath: configuration.output.path) {
        try fileManager.removeItem(at: configuration.output)
    }

    let framesPerSecond: Int32 = 30
    let secondsPerSlide: Double = 3
    let transitionSeconds: Double = 0.55
    let totalSeconds = secondsPerSlide * Double(configuration.images.count)
    let totalFrames = Int(totalSeconds * Double(framesPerSecond))

    let writer = try AVAssetWriter(outputURL: configuration.output, fileType: .mp4)
    let compression: [String: Any] = [
        AVVideoAverageBitRateKey: 15_000_000,
        AVVideoExpectedSourceFrameRateKey: Int(framesPerSecond),
        AVVideoMaxKeyFrameIntervalKey: Int(framesPerSecond) * 2,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ]
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: configuration.width,
        AVVideoHeightKey: configuration.height,
        AVVideoCompressionPropertiesKey: compression,
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let attributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
        kCVPixelBufferWidthKey as String: configuration.width,
        kCVPixelBufferHeightKey as String: configuration.height,
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: attributes
    )
    guard writer.canAdd(input) else { throw PreviewError.writer("Unable to add the video track.") }
    writer.add(input)
    guard writer.startWriting() else {
        throw PreviewError.writer(writer.error?.localizedDescription ?? "Unable to start video export.")
    }
    writer.startSession(atSourceTime: .zero)
    guard let pool = adaptor.pixelBufferPool else { throw PreviewError.pixelBuffer }

    for frame in 0..<totalFrames {
        while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
        let time = Double(frame) / Double(framesPerSecond)
        let rawIndex = Int(time / secondsPerSlide)
        let currentIndex = min(rawIndex, configuration.images.count - 1)
        let nextIndex = (currentIndex + 1) % configuration.images.count
        let localTime = time - Double(currentIndex) * secondsPerSlide
        let slideProgress = CGFloat(localTime / secondsPerSlide)
        let transitionStart = secondsPerSlide - transitionSeconds
        let transitionProgress = localTime > transitionStart
            ? CGFloat((localTime - transitionStart) / transitionSeconds)
            : 0
        let buffer = try makeFrame(
            configuration: configuration,
            currentIndex: currentIndex,
            nextIndex: nextIndex,
            slideProgress: slideProgress,
            transitionProgress: transitionProgress,
            pool: pool
        )
        let presentationTime = CMTime(value: CMTimeValue(frame), timescale: framesPerSecond)
        guard adaptor.append(buffer, withPresentationTime: presentationTime) else {
            throw PreviewError.writer(writer.error?.localizedDescription ?? "Unable to append a video frame.")
        }
    }

    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    guard writer.status == .completed else {
        throw PreviewError.writer(writer.error?.localizedDescription ?? "Video export failed.")
    }
}

do {
    let arguments = CommandLine.arguments
    guard arguments.count >= 10,
          let width = Int(arguments[1]),
          let height = Int(arguments[2]) else {
        throw PreviewError.usage
    }
    let output = URL(fileURLWithPath: arguments[3])
    let images = try arguments.dropFirst(4).map(loadCGImage)
    try render(PreviewConfiguration(width: width, height: height, output: output, images: images))
    print(output.path)
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
