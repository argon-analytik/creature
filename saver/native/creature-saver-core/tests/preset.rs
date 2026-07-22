use creature_saver_core::{Origin, parse};

#[test]
fn parses_the_browser_compatible_preset_shape() {
    let preset = parse(include_str!("fixtures/minimal.creature")).expect("valid preset");
    assert_eq!(preset.id, "creature-12345678");
    assert!(matches!(preset.specimen.origin, Origin::Morphospace));
    assert_eq!(preset.specimen.genome.source_point_count, 12_000);
}
