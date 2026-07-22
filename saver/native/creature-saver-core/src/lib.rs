use serde::Deserialize;

pub const FORMAT: &str = "creature-saver";
pub const VERSION: u32 = 1;

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Preset {
    pub format: String,
    pub version: u32,
    pub id: String,
    pub specimen: Specimen,
    pub locomotion: Locomotion,
    pub presentation: Presentation,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Specimen {
    pub name: String,
    pub genome: Genome,
    pub morph: Morph,
    pub palette: Palette,
    #[serde(rename = "customMorph")]
    pub custom_morph: CustomMorph,
    pub origin: Origin,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Origin {
    Morphospace,
    MuseumWorkingCopy,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Genome {
    pub seed: u32,
    pub family: u8,
    pub modules: [u8; 4],
    pub development: [f64; 4],
    pub parameters: [f64; 24],
    #[serde(rename = "sourcePointCount")]
    pub source_point_count: u32,
    pub normalization: f64,
    #[serde(rename = "centerX")]
    pub center_x: f64,
    #[serde(rename = "centerY")]
    pub center_y: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Morph {
    pub scale: f64,
    pub reach: f64,
    pub fold: f64,
    pub lobes: f64,
    pub tension: f64,
    pub mutation: f64,
    pub gesture: f64,
    pub resonance: f64,
    pub texture: f64,
    pub polarity: f64,
    pub phase: f64,
    pub motion: f64,
    pub pulse: f64,
    pub density: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Palette {
    pub body: String,
    pub pulse: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CustomMorph {
    pub assignments: Vec<Assignment>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Assignment {
    pub target: Target,
    pub expression: Expression,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Target {
    X,
    Y,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Expression {
    Number {
        value: f64,
    },
    Variable {
        name: Variable,
    },
    Unary {
        operator: UnaryOperator,
        argument: Box<Expression>,
    },
    Binary {
        operator: BinaryOperator,
        left: Box<Expression>,
        right: Box<Expression>,
    },
    Call {
        name: Function,
        argument: Box<Expression>,
    },
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Variable {
    X,
    Y,
    U,
    Time,
}

#[derive(Debug, Clone, Deserialize)]
pub enum UnaryOperator {
    #[serde(rename = "+")]
    Plus,
    #[serde(rename = "-")]
    Minus,
}

#[derive(Debug, Clone, Deserialize)]
pub enum BinaryOperator {
    #[serde(rename = "+")]
    Add,
    #[serde(rename = "-")]
    Subtract,
    #[serde(rename = "*")]
    Multiply,
    #[serde(rename = "/")]
    Divide,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Function {
    Sin,
    Cos,
    Abs,
    Sqrt,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Locomotion {
    pub forward: [f64; 2],
    pub confidence: f64,
    pub cadence: f64,
    pub speed: f64,
    pub curvature: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Presentation {
    pub scale: f64,
    #[serde(rename = "edgeMargin")]
    pub edge_margin: f64,
    pub path: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PresetError {
    Json,
    Format,
    Version,
    Id,
    Specimen,
    Motion,
    Presentation,
    Expression,
}

pub fn parse(source: &str) -> Result<Preset, PresetError> {
    let preset: Preset = serde_json::from_str(source).map_err(|_| PresetError::Json)?;
    validate(&preset)?;
    Ok(preset)
}

pub fn validate(preset: &Preset) -> Result<(), PresetError> {
    if preset.format != FORMAT {
        return Err(PresetError::Format);
    }
    if preset.version != VERSION {
        return Err(PresetError::Version);
    }
    if !preset.id.starts_with("creature-")
        || preset.id.len() != 17
        || !preset.id[9..]
            .chars()
            .all(|value| value.is_ascii_hexdigit())
    {
        return Err(PresetError::Id);
    }
    if preset.specimen.name.trim().is_empty()
        || preset.specimen.name.chars().count() > 96
        || preset.specimen.genome.family > 6
        || !(1..=40_000).contains(&preset.specimen.genome.source_point_count)
        || !finite_slice(&preset.specimen.genome.development)
        || !finite_slice(&preset.specimen.genome.parameters)
        || !preset.specimen.genome.normalization.is_finite()
        || !preset.specimen.genome.center_x.is_finite()
        || !preset.specimen.genome.center_y.is_finite()
        || !finite_morph(&preset.specimen.morph)
        || !valid_hex(&preset.specimen.palette.body)
        || !valid_hex(&preset.specimen.palette.pulse)
        || preset.specimen.custom_morph.assignments.len() > 12
    {
        return Err(PresetError::Specimen);
    }
    if preset
        .locomotion
        .forward
        .iter()
        .any(|value| !value.is_finite() || value.abs() > 1.0)
        || !(0.0..=1.0).contains(&preset.locomotion.confidence)
        || !(0.72..=1.72).contains(&preset.locomotion.cadence)
        || !(0.035..=0.075).contains(&preset.locomotion.speed)
        || !(0.045..=0.14).contains(&preset.locomotion.curvature)
    {
        return Err(PresetError::Motion);
    }
    if !(0.56..=0.92).contains(&preset.presentation.scale)
        || !(0.2..=0.3).contains(&preset.presentation.edge_margin)
        || preset.presentation.path != "cross-current"
    {
        return Err(PresetError::Presentation);
    }
    if preset
        .specimen
        .custom_morph
        .assignments
        .iter()
        .any(|assignment| !valid_expression(&assignment.expression, 0))
    {
        return Err(PresetError::Expression);
    }
    Ok(())
}

fn finite_slice(values: &[f64]) -> bool {
    values.iter().all(|value| value.is_finite())
}

fn finite_morph(morph: &Morph) -> bool {
    finite_slice(&[
        morph.scale,
        morph.reach,
        morph.fold,
        morph.lobes,
        morph.tension,
        morph.mutation,
        morph.gesture,
        morph.resonance,
        morph.texture,
        morph.polarity,
        morph.phase,
        morph.motion,
        morph.pulse,
        morph.density,
    ])
}

fn valid_hex(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..]
            .chars()
            .all(|character| character.is_ascii_hexdigit())
}

fn valid_expression(expression: &Expression, depth: usize) -> bool {
    if depth > 12 {
        return false;
    }
    match expression {
        Expression::Number { value } => value.is_finite() && value.abs() <= 1_000.0,
        Expression::Variable { .. } => true,
        Expression::Unary { argument, .. } | Expression::Call { argument, .. } => {
            valid_expression(argument, depth + 1)
        }
        Expression::Binary { left, right, .. } => {
            valid_expression(left, depth + 1) && valid_expression(right, depth + 1)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_an_unrecognised_expression_kind() {
        let source = r#"{"format":"creature-saver","version":1,"id":"creature-12345678","specimen":{"name":"x","genome":{},"morph":{},"palette":{},"customMorph":{"assignments":[{"target":"x","expression":{"kind":"javascript"}}]},"origin":"morphospace"},"locomotion":{},"presentation":{}}"#;
        assert!(matches!(parse(source), Err(PresetError::Json)));
    }
}
