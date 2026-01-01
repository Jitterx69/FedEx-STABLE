use std::io::Result;

fn main() -> Result<()> {
    prost_build::compile_protos(
        &["../../../schemas/events.proto"],
        &["../../../schemas/"]
    )?;
    Ok(())
}
