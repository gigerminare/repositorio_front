import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { prepareImages, searchPhotos } from "../scripts/prepare-images.mjs";

const API_KEY = "test-only-not-a-real-credential";
const IMAGE_URL = (id) => `https://images.pexels.com/photos/${id}/fixture.jpg`;
const PHOTO_URL = (id) => `https://www.pexels.com/photo/fixture-${id}/`;

function photo(id, overrides = {}) {
  return {
    id,
    url: PHOTO_URL(id),
    photographer: `Photographer ${id}`,
    photographer_url: "https://www.pexels.com/@fixture-photographer/",
    src: { large: IMAGE_URL(id) },
    width: 1200,
    height: 800,
    ...overrides,
  };
}

function equipment(patrimonio, query = `equipment ${patrimonio}`) {
  return {
    patrimonio,
    nome: `Equipamento ${patrimonio}`,
    categoria: "notebook",
    query,
  };
}

function approvedReview(overrides = {}) {
  return {
    reviewedBy: "fixture-reviewer",
    reviewedAt: "2026-11-11T12:00:00.000Z",
    approved: true,
    people: false,
    brandsOrLogos: false,
    readableText: false,
    screenContent: false,
    ...overrides,
  };
}

async function fixtureImage() {
  return sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 32, g: 112, b: 168 },
    },
  })
    .jpeg()
    .toBuffer();
}

function mockFetch(photos, imageBytes) {
  const calls = [];
  const fetchImpl = async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options });

    if (url.startsWith("https://api.pexels.com/v1/search?")) {
      assert.equal(options.headers.Authorization, API_KEY);
      return { ok: true, json: async () => ({ photos }) };
    }

    if (photos.some((candidate) => candidate.src.large === url)) {
      return {
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () =>
          imageBytes.buffer.slice(
            imageBytes.byteOffset,
            imageBytes.byteOffset + imageBytes.byteLength,
          ),
      };
    }

    throw new Error(`Chamada externa não mockada: ${url}`);
  };
  return { fetchImpl, calls };
}

async function outputDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "imagens-equipamentos-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("gera JPEG exatamente 800x600 e usa somente endpoints Pexels", async (t) => {
  const source = await fixtureImage();
  const candidate = photo(12345);
  const { fetchImpl, calls } = mockFetch([candidate], source);
  const outputDir = await outputDirectory(t);
  const result = await prepareImages(
    [{ equipment: equipment("TI-0001"), photoId: candidate.id, review: approvedReview() }],
    { apiKey: API_KEY, outputDir, fetchImpl },
  );

  const imageBytes = await readFile(join(outputDir, "images", "TI-0001.jpg"));
  const imageInfo = await sharp(imageBytes).metadata();
  assert.deepEqual(
    { width: imageInfo.width, height: imageInfo.height, format: imageInfo.format },
    { width: 800, height: 600, format: "jpeg" },
  );
  assert(calls.some(({ url }) => url.startsWith("https://api.pexels.com/v1/search?")));
  assert(calls.some(({ url }) => url.startsWith("https://images.pexels.com/")));
  assert(calls.every(({ url }) =>
    url.startsWith("https://api.pexels.com/v1/search?") ||
    url.startsWith("https://images.pexels.com/"),
  ));
  assert(calls.every(({ options }) => options.redirect === "error"));
  assert.equal(result.images.length, 1);
});

test("bloqueia cada condição visual proibida e revisão incompleta", async () => {
  const source = await fixtureImage();
  const candidate = photo(12346);
  const { fetchImpl, calls } = mockFetch([candidate], source);
  const prohibited = ["people", "brandsOrLogos", "readableText", "screenContent"];

  for (const condition of prohibited) {
    await assert.rejects(
      prepareImages(
        [{
          equipment: equipment(`TI-${condition}`),
          photoId: candidate.id,
          review: approvedReview({ [condition]: true }),
        }],
        { apiKey: API_KEY, outputDir: "unused", fetchImpl },
      ),
      /Revisão visual incompleta ou reprovada/,
    );
  }

  for (const condition of prohibited) {
    const incompleteReview = approvedReview();
    delete incompleteReview[condition];
    await assert.rejects(
      prepareImages(
        [{
          equipment: equipment(`TI-missing-${condition}`),
          photoId: candidate.id,
          review: incompleteReview,
        }],
        { apiKey: API_KEY, outputDir: "unused", fetchImpl },
      ),
      /Revisão visual incompleta ou reprovada/,
    );
  }

  await assert.rejects(
    prepareImages(
      [{
        equipment: equipment("TI-unapproved"),
        photoId: candidate.id,
        review: approvedReview({ approved: false }),
      }],
      { apiKey: API_KEY, outputDir: "unused", fetchImpl },
    ),
    /sem aprovação explícita/,
  );
  assert.equal(calls.length, 0, "revisões reprovadas não devem chamar a API");
});

test("rejeita patrimônio duplicado e reutilização da mesma foto", async () => {
  const source = await fixtureImage();
  const candidate = photo(12347);
  const { fetchImpl, calls } = mockFetch([candidate], source);
  const first = {
    equipment: equipment("TI-0001"),
    photoId: candidate.id,
    review: approvedReview(),
  };

  await assert.rejects(
    prepareImages(
      [first, { ...first, review: approvedReview() }],
      { apiKey: API_KEY, outputDir: "unused", fetchImpl },
    ),
    /Equipamento duplicado/,
  );
  await assert.rejects(
    prepareImages(
      [
        first,
        {
          equipment: equipment("TI-0002"),
          photoId: candidate.id,
          review: approvedReview(),
        },
      ],
      { apiKey: API_KEY, outputDir: "unused", fetchImpl },
    ),
    /Foto Pexels reutilizada/,
  );
  assert.equal(calls.length, 0, "manifestos duplicados devem ser rejeitados antes da rede");
});

test("preserva origem, fotógrafo, licença, revisão e crédito no manifesto", async (t) => {
  const source = await fixtureImage();
  const candidate = photo(12348);
  const { fetchImpl } = mockFetch([candidate], source);
  const outputDir = await outputDirectory(t);
  const result = await prepareImages(
    [{
      equipment: equipment("TI-0003", "laptop on white desk"),
      photoId: candidate.id,
      review: approvedReview(),
    }],
    { apiKey: API_KEY, outputDir, fetchImpl },
  );
  const saved = JSON.parse(await readFile(join(outputDir, "manifest.json"), "utf8"));
  const image = saved.images[0];

  assert.equal(image.source, "Pexels");
  assert.equal(image.sourceUrl, candidate.url);
  assert.equal(image.imageUrl, candidate.src.large);
  assert.equal(image.photographer, candidate.photographer);
  assert.equal(image.photographerUrl, candidate.photographer_url);
  assert.equal(image.license, "Pexels License");
  assert.equal(image.licenseUrl, "https://www.pexels.com/license/");
  assert.deepEqual(image.credit, { text: "Fotos: Pexels", url: candidate.url });
  assert.equal(image.review.reviewedBy, "fixture-reviewer");
  assert.equal(image.storageObjectPath, "equipment/TI-0003.jpg");
  assert.equal(result.images[0].photoId, candidate.id);
});

test("repetir a mesma entrada mantém os mesmos caminhos e conteúdo", async (t) => {
  const source = await fixtureImage();
  const candidate = photo(12349);
  const { fetchImpl } = mockFetch([candidate], source);
  const outputDir = await outputDirectory(t);
  const record = {
    equipment: equipment("TI-0004"),
    photoId: candidate.id,
    review: approvedReview(),
  };

  await prepareImages([record], { apiKey: API_KEY, outputDir, fetchImpl });
  const firstImage = await readFile(join(outputDir, "images", "TI-0004.jpg"));
  const firstManifest = await readFile(join(outputDir, "manifest.json"));
  await prepareImages([record], { apiKey: API_KEY, outputDir, fetchImpl });
  const secondImage = await readFile(join(outputDir, "images", "TI-0004.jpg"));
  const secondManifest = await readFile(join(outputDir, "manifest.json"));
  const imageFiles = await readdir(join(outputDir, "images"));

  assert.equal(
    createHash("sha256").update(firstImage).digest("hex"),
    createHash("sha256").update(secondImage).digest("hex"),
  );
  assert.deepEqual(firstManifest, secondManifest);
  assert.deepEqual(imageFiles, ["TI-0004.jpg"]);
});

test("não contém chave Pexels embutida e exige credencial somente no ambiente", async () => {
  const script = await readFile(
    new URL("../scripts/prepare-images.mjs", import.meta.url),
    "utf8",
  );
  assert.match(script, /process\.env\.PEXELS_API_KEY/);
  assert.doesNotMatch(
    script,
    /PEXELS_API_KEY\s*[:=]\s*["'][^"']{8,}["']/,
  );
  await assert.rejects(
    searchPhotos({ query: "laptop", apiKey: "", fetchImpl: async () => assert.fail("sem chave não deve chamar a API") }),
    /Defina PEXELS_API_KEY no ambiente local/,
  );
});
