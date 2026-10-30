// Verhindert ein zusätzliches Konsolenfenster unter Windows; auf dem Mac ohne Wirkung.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lut_generator_lib::run()
}
