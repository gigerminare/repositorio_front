import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const API_URL = "https://api.pexels.com/v1/search";
const LICENSE_URL = "https://www.pexels.com/license/";
const REVIEW_FIELDS = [
  "people",
  "brandsOrLogos",
  "readableText",
  "screenContent",
];
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function requireApiKey(apiKey) {
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new Error("Defina PEXELS_API_KEY no ambiente local.");
  }
  return apiKey.trim();
}

function requireHttpsUrl(value, hosts, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} inválida.`);
  }
  if (url.protocol !== "https:" || !hosts.includes(url.hostname)) {
    throw new Error(`${label} não pertence à origem Pexels autorizada.`);
  }
  return url.href;
}

function validateEquipment(equipment) {
  if (!equipment || typeof equipment !== "object") {
    throw new Error("Equipamento inválido.");
  }
  const { patrimonio, nome, categoria, query } = equipment;
  if (
    typeof patrimonio !== "string" ||
    !/^[A-Za-z0-9-]+$/.test(patrimonio) ||
    typeof nome !== "string" ||
    nome.trim() === "" ||
    typeof categoria !== "string" ||
    categoria.trim() === "" ||
    typeof query !== "string" ||
    query.trim() === ""
  ) {
    throw new Error("Equipamento precisa de patrimônio, nome, categoria e busca válidos.");
  }
  return { patrimonio, nome: nome.trim(), categoria: categoria.trim(), query: query.trim() };
}

function validateReview(review) {
  if (
    !review ||
    typeof review !== "object" ||
    review.approved !== true ||
    typeof review.reviewedBy !== "string" ||
    review.reviewedBy.trim() === "" ||
    typeof review.reviewedAt !== "string" ||
    !Number.isFinite(Date.parse(review.reviewedAt))
  ) {
    throw new Error("Revisão visual ausente ou sem aprovação explícita.");
  }

  for (const field of REVIEW_FIELDS) {
    if (review[field] !== false) {
      throw new Error(`Revisão visual incompleta ou reprovada: ${field}.`);
    }
  }
}

function validateRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("O manifesto deve conter ao menos uma imagem.");
  }

  const equipmentIds = new Set();
  const photoIds = new Set();
  return records.map((record) => {
    const equipment = validateEquipment(record?.equipment);
    if (equipmentIds.has(equipment.patrimonio)) {
      throw new Error(`Equipamento duplicado: ${equipment.patrimonio}.`);
    }
    equipmentIds.add(equipment.patrimonio);
    validateReview(record.review);

    if (!Number.isSafeInteger(record.photoId) || record.photoId <= 0) {
      throw new Error(`Identificador Pexels inválido para ${equipment.patrimonio}.`);
    }
    if (photoIds.has(record.photoId)) {
      throw new Error(`Foto Pexels reutilizada: ${record.photoId}.`);
    }
    photoIds.add(record.photoId);

    return { equipment, photoId: record.photoId, review: record.review };
  });
}

async function requestJson(url, apiKey, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { Authorization: apiKey, Accept: "application/json" },
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`A API Pexels respondeu HTTP ${response.status}.`);
  }
  return response.json();
}

export async function searchPhotos({ query, apiKey = process.env.PEXELS_API_KEY, fetchImpl = fetch }) {
  if (typeof query !== "string" || query.trim() === "") {
    throw new Error("Informe um termo de busca.");
  }
  const key = requireApiKey(apiKey);
  const url = new URL(API_URL);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("per_page", "15");
  const data = await requestJson(url, key, fetchImpl);
  if (!Array.isArray(data?.photos)) {
    throw new Error("A resposta da API Pexels não contém fotos.");
  }

  return data.photos.map((photo) => ({
    photoId: photo.id,
    sourceUrl: photo.url,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    imageUrl: photo.src?.large,
    width: photo.width,
    height: photo.height,
  }));
}

function metadataFromPhoto(photo, equipment, review) {
  if (
    !Number.isSafeInteger(photo.photoId) ||
    typeof photo.photographer !== "string" ||
    photo.photographer.trim() === ""
  ) {
    throw new Error(`A API Pexels retornou metadados incompletos para ${equipment.patrimonio}.`);
  }
  return {
    patrimonio: equipment.patrimonio,
    nome: equipment.nome,
    categoria: equipment.categoria,
    query: equipment.query,
    photoId: photo.photoId,
    source: "Pexels",
    sourceUrl: requireHttpsUrl(photo.sourceUrl, ["www.pexels.com", "pexels.com"], "URL da foto"),
    imageUrl: requireHttpsUrl(photo.imageUrl, ["images.pexels.com"], "URL da imagem"),
    photographer: photo.photographer.trim(),
    photographerUrl: requireHttpsUrl(
      photo.photographerUrl,
      ["www.pexels.com", "pexels.com"],
      "URL do fotógrafo",
    ),
    license: "Pexels License",
    licenseUrl: LICENSE_URL,
    credit: {
      text: "Fotos: Pexels",
      url: requireHttpsUrl(photo.sourceUrl, ["www.pexels.com", "pexels.com"], "URL do crédito"),
    },
    review: {
      reviewedBy: review.reviewedBy.trim(),
      reviewedAt: new Date(review.reviewedAt).toISOString(),
      approved: true,
      people: false,
      brandsOrLogos: false,
      readableText: false,
      screenContent: false,
    },
    file: `images/${equipment.patrimonio}.jpg`,
    storageObjectPath: `equipment/${equipment.patrimonio}.jpg`,
  };
}

async function downloadImage(imageUrl, fetchImpl) {
  const url = requireHttpsUrl(imageUrl, ["images.pexels.com"], "URL da imagem");
  const response = await fetchImpl(url, {
    headers: { Accept: "image/*" },
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`O download da imagem Pexels respondeu HTTP ${response.status}.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error("A URL Pexels não retornou um tipo de conteúdo de imagem.");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("A imagem Pexels está vazia ou excede o limite local de tamanho.");
  }
  return bytes;
}

export async function prepareImages(
  records,
  {
    apiKey = process.env.PEXELS_API_KEY,
    outputDir,
    fetchImpl = fetch,
    imageProcessor = sharp,
  },
) {
  const key = requireApiKey(apiKey);
  if (typeof outputDir !== "string" || outputDir.trim() === "") {
    throw new Error("Informe uma pasta local de saída.");
  }
  const validatedRecords = validateRecords(records);
  const prepared = [];

  for (const record of validatedRecords) {
    const photos = await searchPhotos({
      query: record.equipment.query,
      apiKey: key,
      fetchImpl,
    });
    const candidate = photos.find((photo) => photo.photoId === record.photoId);
    if (!candidate) {
      throw new Error(
        `A foto ${record.photoId} não foi retornada pela busca Pexels de ${record.equipment.patrimonio}.`,
      );
    }

    const imageBytes = await downloadImage(candidate.imageUrl, fetchImpl);
    let output;
    try {
      output = await imageProcessor(imageBytes)
        .rotate()
        .resize(800, 600, { fit: "cover", position: "centre" })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new Error(`Não foi possível processar a imagem de ${record.equipment.patrimonio}.`);
    }
    if (output.info.width !== 800 || output.info.height !== 600 || output.info.format !== "jpeg") {
      throw new Error(`A imagem processada de ${record.equipment.patrimonio} não ficou em JPEG 800x600.`);
    }

    prepared.push({
      metadata: metadataFromPhoto(candidate, record.equipment, record.review),
      bytes: output.data,
    });
  }

  const root = resolve(outputDir);
  const imageDirectory = join(root, "images");
  await mkdir(imageDirectory, { recursive: true });
  for (const item of prepared) {
    const target = resolve(root, item.metadata.file);
    const relativeTarget = relative(imageDirectory, target);
    if (relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
      throw new Error("O caminho de saída da imagem é inválido.");
    }
    await writeFile(target, item.bytes);
  }

  const manifest = {
    formatVersion: 1,
    target: "Supabase Storage public bucket (upload not performed)",
    images: prepared.map(({ metadata }) => metadata),
  };
  await writeFile(join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`Argumentos inválidos próximos a ${key ?? "fim da linha"}.`);
    }
    options[key.slice(2)] = value;
  }
  return options;
}

async function main(args) {
  const [command, ...rest] = args;
  const options = parseOptions(rest);
  if (command === "search") {
    if (!options.equipment || !options.query) {
      throw new Error("Uso: search --equipment TI-0001 --query \"termo da atividade\"");
    }
    const photos = await searchPhotos({ query: options.query });
    console.log(JSON.stringify({ equipment: options.equipment, query: options.query, photos }, null, 2));
    return;
  }
  if (command === "prepare") {
    if (!options.manifest || !options.output) {
      throw new Error("Uso: prepare --manifest <arquivo.json> --output <pasta-local>");
    }
    const manifestPath = resolve(options.manifest);
    const input = JSON.parse(await readFile(manifestPath, "utf8"));
    const manifest = await prepareImages(input.images, { outputDir: resolve(options.output) });
    console.log(JSON.stringify({ outputDirectory: resolve(options.output), count: manifest.images.length }));
    return;
  }
  throw new Error(
    "Uso: search --equipment <patrimônio> --query <termo> | prepare --manifest <arquivo.json> --output <pasta-local>",
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : "Falha na preparação local.");
    process.exitCode = 1;
  });
}
