use std::{env, fs, process::ExitCode};

fn main() -> ExitCode {
    let Some(path) = env::args_os().nth(1) else {
        eprintln!("usage: creature-saver-cli <preset.creature>");
        return ExitCode::from(64);
    };
    let source = match fs::read_to_string(path) {
        Ok(source) => source,
        Err(error) => {
            eprintln!("could not read preset: {error}");
            return ExitCode::from(66);
        }
    };
    match creature_saver_core::parse(&source) {
        Ok(preset) => {
            println!("valid {} ({:?})", preset.id, preset.specimen.origin);
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("invalid Creature preset: {error:?}");
            ExitCode::from(65)
        }
    }
}
