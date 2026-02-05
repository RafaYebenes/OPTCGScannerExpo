-- Insertar/Actualizar Sets de One Piece TCG (Lista Completa Actualizada)
INSERT INTO public.sets (code, name, release_date) VALUES 
    -- === MAIN BOOSTERS (OP) ===
    ('OP01', 'Romance Dawn', '2022-12-02'),
    ('OP02', 'Paramount War', '2023-03-10'),
    ('OP03', 'Pillars of Strength', '2023-06-30'),
    ('OP04', 'Kingdoms of Intrigue', '2023-09-22'),
    ('OP05', 'Awakening of the New Era', '2023-12-08'),
    ('OP06', 'Wings of the Captain', '2024-03-15'),
    ('OP07', '500 Years into the Future', '2024-06-28'),
    ('OP08', 'Two Legends', '2024-09-13'),
    ('OP09', 'Emperors in the New World', '2024-12-13'), -- "The Four Emperors"
    ('OP10', 'Royal Blood', '2025-03-14'),
    ('OP11', 'A Fist of Divine Speed', '2025-06-20'),
    ('OP12', 'Legacy of the Master', '2025-08-22'),
    ('OP13', 'Carrying on his Will', '2025-11-21'),
    ('OP14', 'The Azure Sea’s Seven', '2026-02-27'), -- ¡El set actual!
    ('OP15', 'The Adventure of the Island of God', '2026-05-29'), -- Próximo lanzamiento

    -- === EXTRA BOOSTERS (EB) ===
    ('EB01', 'Memorial Collection', '2024-05-03'),
    ('EB02', 'Anime 25th Collection', '2025-01-25'),
    ('EB03', 'Heroines Edition', '2026-02-20'), -- Coincide con OP14 aprox
    ('EB04', 'The Azure Sea´s Seven', '2026-08-01'), -- Coincide con OP15 aprox

    -- === PREMIUM BOOSTERS (PRB) ===
    ('PRB01', 'The Best', '2024-11-08'),
    ('PRB02', 'The Best Vol.2', '2025-10-03'),

    -- === STARTER DECKS (ST) ===
    ('ST01', 'Straw Hat Crew', '2022-12-02'),
    ('ST02', 'Worst Generation', '2022-12-02'),
    ('ST03', 'The Seven Warlords of the Sea', '2022-12-02'),
    ('ST04', 'Animal Kingdom Pirates', '2022-12-02'),
    ('ST05', 'Film Edition', '2023-02-03'),
    ('ST06', 'Absolute Justice', '2023-03-10'),
    ('ST07', 'Big Mom Pirates', '2023-06-30'),
    ('ST08', 'Monkey D. Luffy', '2023-08-11'),
    ('ST09', 'Yamato', '2023-08-11'),
    ('ST10', 'The Three Captains', '2023-11-10'),
    ('ST11', 'Uta', '2024-02-02'),
    ('ST12', 'Zoro & Sanji', '2024-03-15'),
    ('ST13', 'The Three Brothers', '2024-04-19'),
    ('ST14', '3D2Y', '2024-08-16'),
    ('ST15', 'Edward Newgate', '2024-10-25'),
    ('ST16', 'Uta (Green)', '2024-10-25'),
    ('ST17', 'Donquixote Doflamingo', '2024-10-25'),
    ('ST18', 'Purple Monkey D. Luffy', '2024-10-25'),
    ('ST19', 'Smoker', '2024-10-25'),
    ('ST20', 'Charlotte Katakuri', '2024-10-25'),
    -- Nuevos Starters 2025-2026
    ('ST21', 'Starter Deck EX -Gear 5-', '2025-03-14'),
    ('ST22', 'Starter Deck EX -Ace & Newgate-', '2025-09-05'),
    ('ST23', 'Red Shanks', '2025-11-01'),        -- Fechas aprox Global
    ('ST24', 'Green Jewelry Bonney', '2025-11-01'),
    ('ST25', 'Blue Buggy', '2025-11-01'),
    ('ST26', 'Purple Black Monkey D. Luffy', '2025-11-01'),
    ('ST27', 'Black Marshall D. Teach', '2025-11-01'),
    ('ST28', 'Green Yellow Yamato', '2025-11-01'),
    ('ST29', 'Starter Deck: Egghead', '2026-03-01'),
    ('ST30', 'New Starter 2026', '2026-08-01')

ON CONFLICT (code) 
DO UPDATE SET 
    name = EXCLUDED.name, 
    release_date = EXCLUDED.release_date;