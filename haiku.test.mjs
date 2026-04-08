import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted() runs before any imports, so these mocks are available in vi.mock() factories.
const { mockCreate, MockOpenAI } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  // Must be a regular function (not arrow) so `new MockOpenAI()` works as a constructor.
  const MockOpenAI = vi.fn(function (opts) {
    this._opts = opts;
    this.responses = { create: mockCreate };
  });
  return { mockCreate, MockOpenAI };
});

vi.mock("openai", () => ({ default: MockOpenAI }));

describe("haiku.mjs", () => {
  const DEFAULT_OUTPUT = "bytes of thought flow\nsilicon dreams calculate\nhaiku from the void";
  let originalApiKey;
  let exitSpy;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Persist and clear the API key so each test starts clean.
    originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    // Reset call history on the shared mocks.
    mockCreate.mockReset();
    MockOpenAI.mockClear();

    // Default success response.
    mockCreate.mockResolvedValue({ output_text: DEFAULT_OUTPUT });

    // Intercept side-effectful globals.
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Bust the module cache so haiku.mjs re-executes on each dynamic import.
    vi.resetModules();
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
    vi.restoreAllMocks();
  });

  // ── Missing / invalid API key ────────────────────────────────────────────────

  it("calls process.exit(1) when OPENAI_API_KEY is not set", async () => {
    await expect(import("./haiku.mjs")).rejects.toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("logs the correct error message to stderr when OPENAI_API_KEY is not set", async () => {
    await expect(import("./haiku.mjs")).rejects.toThrow("process.exit called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Please set OPENAI_API_KEY before running this script."
    );
  });

  it("treats an empty-string OPENAI_API_KEY as missing and exits with code 1", async () => {
    process.env.OPENAI_API_KEY = "";

    await expect(import("./haiku.mjs")).rejects.toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does not instantiate the OpenAI client when no API key is provided", async () => {
    await expect(import("./haiku.mjs")).rejects.toThrow("process.exit called");
    expect(MockOpenAI).not.toHaveBeenCalled();
  });

  it("does not call responses.create when no API key is provided", async () => {
    await expect(import("./haiku.mjs")).rejects.toThrow("process.exit called");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ── Successful execution ─────────────────────────────────────────────────────

  it("instantiates OpenAI with the API key read from the environment", async () => {
    process.env.OPENAI_API_KEY = "test-api-key-123";

    await import("./haiku.mjs");

    expect(MockOpenAI).toHaveBeenCalledWith({ apiKey: "test-api-key-123" });
  });

  it("does not hardcode the API key — uses whatever value is in the environment", async () => {
    const customKey = "sk-proj-custom-unique-key-xyz";
    process.env.OPENAI_API_KEY = customKey;

    await import("./haiku.mjs");

    const [[constructorArg]] = MockOpenAI.mock.calls;
    expect(constructorArg.apiKey).toBe(customKey);
  });

  it("calls responses.create with model 'gpt-5-nano'", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-5-nano" })
    );
  });

  it("calls responses.create with the haiku input prompt", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ input: "write a haiku about ai" })
    );
  });

  it("calls responses.create with store set to true", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ store: true })
    );
  });

  it("calls responses.create with all three required parameters at once", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(mockCreate).toHaveBeenCalledExactlyOnceWith({
      model: "gpt-5-nano",
      input: "write a haiku about ai",
      store: true,
    });
  });

  it("prints the response output_text to stdout", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const haiku = "silent circuits hum\ndata flows like autumn leaves\nmachine dreams in code";
    mockCreate.mockResolvedValue({ output_text: haiku });

    await import("./haiku.mjs");

    expect(consoleLogSpy).toHaveBeenCalledWith(haiku);
  });

  it("does not call process.exit when OPENAI_API_KEY is present", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(exitSpy).not.toHaveBeenCalled();
  });

  // ── Regression / boundary ────────────────────────────────────────────────────

  it("does not write anything to stderr on a successful run", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("calls responses.create exactly once per script execution", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("instantiates the OpenAI client exactly once per script execution", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    await import("./haiku.mjs");

    expect(MockOpenAI).toHaveBeenCalledTimes(1);
  });
});