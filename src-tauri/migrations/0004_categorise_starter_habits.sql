UPDATE habits SET category_id = 'health', icon = 'activity', colour = '#73bd8c'
WHERE id = 'movement' AND category_id IS NULL;
UPDATE habits SET category_id = 'personal', icon = 'check', colour = '#9c7bd8'
WHERE id = 'make-bed' AND category_id IS NULL;
UPDATE habits SET category_id = 'learning', icon = 'book', colour = '#62a5d8'
WHERE id = 'read' AND category_id IS NULL;
UPDATE habits SET category_id = 'productivity', icon = 'sparkles', colour = '#d99a63'
WHERE id = 'deep-work' AND category_id IS NULL;
UPDATE habits SET category_id = 'health', icon = 'droplet', colour = '#62a5d8'
WHERE id = 'water' AND category_id IS NULL;
UPDATE habits SET category_id = 'personal', icon = 'book', colour = '#9c7bd8'
WHERE id = 'journal' AND category_id IS NULL;
UPDATE habits SET category_id = 'health', icon = 'heart', colour = '#73bd8c'
WHERE id = 'meditate' AND category_id IS NULL;
UPDATE habits SET category_id = 'productivity', icon = 'check', colour = '#d99a63'
WHERE id = 'tomorrow' AND category_id IS NULL;
