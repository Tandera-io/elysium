mod claude;
mod projects;
mod assets;
mod game_project;
mod aseprite;
mod godot_resources;
mod backup;

use tauri_plugin_sql::{Migration, MigrationKind};

pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "initial schema",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "relax phase CHECK constraints for expansion 14-21",
            sql: include_str!("../migrations/002_expansion_phases.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "expand generator CHECK to include 'openai' (gpt-image concept art)",
            sql: include_str!("../migrations/003_openai_generator.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "asset_jobs table for F0 concept pipeline v2",
            sql: include_str!("../migrations/004_asset_jobs.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:elysium.db", migrations)
                .build(),
        )
        .setup(|app| {
            projects::ensure_app_dirs(app.handle())?;
            let _ = aseprite::copy_aseprite_scripts(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            claude::claude_prompt_stream,
            claude::claude_cancel,
            claude::claude_check_installed,
            projects::get_projects_dir,
            projects::create_project_dir,
            projects::list_project_files,
            projects::read_project_file,
            projects::write_project_file,
            projects::delete_project_dir,
            assets::download_asset_to_project,
            assets::compute_prompt_hash,
            assets::save_binary_asset,
            game_project::game_dir_for,
            game_project::scaffold_godot_csharp,
            game_project::copy_approved_assets_to_game,
            game_project::list_game_files,
            game_project::godot_import,
            game_project::dotnet_build,
            game_project::godot_run_headless,
            game_project::game_git_commit,
            game_project::game_git_reset_last,
            game_project::game_git_diff,
            aseprite::aseprite_check_installed,
            aseprite::aseprite_run_script,
            aseprite::aseprite_pack_sheet,
            aseprite::read_binary_asset,
            aseprite::reveal_in_explorer,
            godot_resources::generate_sprite_frames_tres,
            godot_resources::generate_atlas_texture_tres,
            godot_resources::generate_tileset_resource_tres,
            godot_resources::write_tscn_scene,
            backup::sync_backup_tree,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
