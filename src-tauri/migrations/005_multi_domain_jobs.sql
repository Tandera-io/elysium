-- Multi-domain asset_jobs — prepara a fila para F1 sprites, F2 tilesets,
-- F3-F6 (ui/vfx/sfx/music), F8.5 assembly, F9 scene build, F14 code gen
-- e smoke tests. Default 'concept_art' para preservar rows existentes.

ALTER TABLE asset_jobs ADD COLUMN domain TEXT NOT NULL DEFAULT 'concept_art'
    CHECK (domain IN (
        'concept_art',
        'character_sprite',
        'tileset',
        'ui_icon',
        'vfx_item',
        'audio_sfx',
        'audio_music',
        'scene_build',
        'code_gen',
        'smoke_test',
        'assembly_link'
    ));

CREATE INDEX IF NOT EXISTS idx_jobs_domain_status
    ON asset_jobs(project_id, domain, status);

-- Recria o índice unique composto incluindo domain: um canon_slug pode ter
-- múltiplos jobs (1 concept_art + 1 character_sprite + 1 tileset...).
DROP INDEX IF EXISTS idx_jobs_project_slug;
CREATE UNIQUE INDEX idx_jobs_project_domain_slug
    ON asset_jobs(project_id, domain, canon_slug);
