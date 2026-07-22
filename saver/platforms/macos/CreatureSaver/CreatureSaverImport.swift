import Foundation

enum ImportError: Error {
  case usage
  case invalidPreset
}

@main
struct CreatureSaverImport {
  static func main() throws {
    let arguments = CommandLine.arguments
    guard arguments.count == 2 else { throw ImportError.usage }
    let source = URL(fileURLWithPath: arguments[1])
    let data = try Data(contentsOf: source)
    guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          root["format"] as? String == "creature-saver",
          root["version"] as? Int == 1,
          root["specimen"] is [String: Any] else { throw ImportError.invalidPreset }
    let applicationSupport = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let destinationDirectory = applicationSupport.appendingPathComponent("Creature Saver", isDirectory: true)
    try FileManager.default.createDirectory(at: destinationDirectory, withIntermediateDirectories: true)
    let destination = destinationDirectory.appendingPathComponent("active.creature")
    try data.write(to: destination, options: .atomic)
  }
}
