import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  process.env.VOYAGE_API_KEY = "test-voyage-key";
});

async function importEmbedding() {
  vi.resetModules();
  return import("./embedding");
}

describe("embedText", () => {
  it("should return a 1024-dimension vector", async () => {
    const fakeEmbedding = Array(1024).fill(0.1);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: fakeEmbedding }],
        usage: { total_tokens: 10 },
      }),
    });

    const { embedText } = await importEmbedding();
    const result = await embedText("hello world");

    expect(result).toEqual(fakeEmbedding);
    expect(result).toHaveLength(1024);
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.voyageai.com/v1/embeddings");
    expect(options.method).toBe("POST");
    expect(options.headers["Authorization"]).toBe("Bearer test-voyage-key");

    const body = JSON.parse(options.body);
    expect(body.input).toEqual(["hello world"]);
    expect(body.model).toBe("voyage-3");
  });

  it("should throw on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    });

    const { embedText } = await importEmbedding();
    await expect(embedText("hello")).rejects.toThrow("Voyage AI API error 429");
  });
});

describe("embedTexts", () => {
  it("should return multiple vectors", async () => {
    const fakeEmbeddings = [
      Array(1024).fill(0.1),
      Array(1024).fill(0.2),
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: fakeEmbeddings.map((e) => ({ embedding: e })),
        usage: { total_tokens: 20 },
      }),
    });

    const { embedTexts } = await importEmbedding();
    const result = await embedTexts(["hello", "world"]);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1024);
    expect(result[1]).toHaveLength(1024);
  });

  it("should batch large inputs into multiple requests", async () => {
    const texts = Array(150).fill("text");
    const fakeEmbedding = Array(1024).fill(0.1);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: Array(128).fill({ embedding: fakeEmbedding }),
        usage: { total_tokens: 1000 },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: Array(22).fill({ embedding: fakeEmbedding }),
        usage: { total_tokens: 200 },
      }),
    });

    const { embedTexts } = await importEmbedding();
    const result = await embedTexts(texts);

    expect(result).toHaveLength(150);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should return empty array for empty input", async () => {
    const { embedTexts } = await importEmbedding();
    const result = await embedTexts([]);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
