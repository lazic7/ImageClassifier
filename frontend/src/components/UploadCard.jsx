import { useEffect, useRef, useState } from "react";

function formatPercent(value) {
  if (typeof value !== "number") return "-";
  return `${(value * 100).toFixed(2)}%`;
}

const PIE_COLORS = [
  "#0f766e",
  "#2563eb",
  "#ea580c",
  "#7c3aed",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#0891b2",
];

function polarToCartesian(cx, cy, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describePieSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function preparePieData(items) {
  const safeItems = (items || [])
    .map((item) => ({
      label: item?.label || "-",
      conf: typeof item?.conf === "number" ? Math.max(0, item.conf) : 0,
    }))
    .filter((item) => item.conf > 0);

  const rawSum = safeItems.reduce((sum, item) => sum + item.conf, 0);
  if (!rawSum) return [];

  const normalized =
    rawSum > 1.001
      ? safeItems.map((item) => ({ ...item, conf: item.conf / rawSum }))
      : [...safeItems];

  const normalizedSum = normalized.reduce((sum, item) => sum + item.conf, 0);
  const remaining = Math.max(0, 1 - normalizedSum);

  if (remaining > 0.01) {
    normalized.push({ label: "Ostalo", conf: remaining });
  }

  return normalized;
}

function ProbabilityPieChart({ title, items, emptyLabel }) {
  const data = preparePieData(items);
  const size = 180;
  const radius = 70;
  const center = size / 2;

  if (!data.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
          {title}
        </div>
        <div className="text-sm text-gray-500">
          {emptyLabel || "Nema podataka"}
        </div>
      </div>
    );
  }

  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const angle = item.conf * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const midAngle = startAngle + angle / 2;
    const labelPos = polarToCartesian(center, center, radius * 0.62, midAngle);

    return {
      ...item,
      color: PIE_COLORS[index % PIE_COLORS.length],
      path: describePieSlice(center, center, radius, startAngle, endAngle),
      midAngle,
      labelPos,
      showInsideLabel: item.conf >= 0.08,
    };
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
        {title}
      </div>

      <div className="grid sm:grid-cols-[190px_1fr] gap-4 items-start">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="mx-auto"
          aria-label={title}
          role="img"
        >
          {slices.map((slice) => (
            <path
              key={`${slice.label}-${slice.color}`}
              d={slice.path}
              fill={slice.color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}

          {slices.map(
            (slice) =>
              slice.showInsideLabel && (
                <text
                  key={`${slice.label}-text`}
                  x={slice.labelPos.x}
                  y={slice.labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#ffffff"
                >
                  {`${Math.round(slice.conf * 100)}%`}
                </text>
              ),
          )}
        </svg>

        <div className="space-y-2">
          {slices.map((slice) => (
            <div
              key={`${slice.label}-legend`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-sm text-gray-800 truncate">
                  {slice.label}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(slice.conf)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getBestLabel(scoreMap) {
  const entries = Object.entries(scoreMap);
  if (!entries.length) return { label: "-", score: 0 };

  const [label, score] = entries.sort((a, b) => b[1] - a[1])[0];
  return { label, score };
}

function buildBatchSummary(predictions) {
  const speciesScores = {};
  const speciesCounts = {};

  predictions.forEach((prediction) => {
    const label = prediction.species || "unknown";
    const conf = prediction.species_conf ?? 0;
    speciesScores[label] = (speciesScores[label] || 0) + conf;
    speciesCounts[label] = (speciesCounts[label] || 0) + 1;
  });

  const bestSpecies = getBestLabel(speciesScores);
  const finalSpecies = bestSpecies.label;

  const breedScores = {};
  const breedCounts = {};

  predictions
    .filter((prediction) => (prediction.species || "unknown") === finalSpecies)
    .forEach((prediction) => {
      const label = prediction.breed || "-";
      const conf = prediction.breed_conf ?? 0;
      breedScores[label] = (breedScores[label] || 0) + conf;
      breedCounts[label] = (breedCounts[label] || 0) + 1;
    });

  const bestBreed = getBestLabel(breedScores);

  return {
    finalSpecies,
    finalSpeciesVotes: speciesCounts[finalSpecies] || 0,
    finalBreed: bestBreed.label,
    finalBreedVotes: breedCounts[bestBreed.label] || 0,
    totalBreedCandidates: predictions.filter(
      (prediction) => (prediction.species || "unknown") === finalSpecies,
    ).length,
    speciesScores,
    speciesCounts,
    breedScores,
    breedCounts,
  };
}

function VotesBarChart({ title, counts, totalVotes, embedded = false }) {
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
  const containerClassName = embedded
    ? "mt-3 pt-3 border-t border-emerald-100"
    : "rounded-lg bg-white border border-emerald-100 p-3";

  if (!entries.length) {
    return (
      <div className={containerClassName}>
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-sm text-gray-500 mt-2">Nema glasova</div>
      </div>
    );
  }

  const maxCount = Math.max(...entries.map(([, count]) => count), 1);
  const denominator =
    typeof totalVotes === "number" && totalVotes > 0 ? totalVotes : maxCount;

  return (
    <div className={containerClassName}>
      <div className="text-xs text-gray-500 mb-3">{title}</div>
      <div className="space-y-2">
        {entries.map(([label, count]) => {
          const width = `${Math.min(100, (count / denominator) * 100)}%`;
          return (
            <div key={`${title}-${label}`}>
              <div className="flex items-center justify-between gap-3 text-xs mb-1">
                <span className="text-gray-700 truncate">{label}</span>
                <span className="text-gray-900 font-medium shrink-0">
                  {count}
                  {typeof totalVotes === "number" ? ` / ${totalVotes}` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BatchSummary({ predictions }) {
  const summary = buildBatchSummary(predictions);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="text-xs uppercase tracking-wide text-emerald-700">
        Konačni rezultat seta slika
      </div>
      <div className="mt-2 grid md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-white border border-emerald-100 p-3">
          <div className="text-xs text-gray-500">Konačna životinja</div>
          <div className="text-lg font-semibold text-gray-900">
            {summary.finalSpecies}
          </div>

          <div className="text-sm text-gray-600">
            Prosjek conf:{" "}
            {formatPercent(
              (summary.speciesScores[summary.finalSpecies] || 0) /
                (summary.finalSpeciesVotes || 1),
            )}
          </div>
          <VotesBarChart
            title="Glasovi po species"
            counts={summary.speciesCounts}
            totalVotes={predictions.length}
            embedded
          />
        </div>

        <div className="rounded-lg bg-white border border-emerald-100 p-3">
          <div className="text-xs text-gray-500">Konačna pasmina</div>
          <div className="text-lg font-semibold text-gray-900">
            {summary.finalBreed}
          </div>

          <div className="text-sm text-gray-600">
            Prosjek conf:{" "}
            {formatPercent(
              (summary.breedScores[summary.finalBreed] || 0) /
                (summary.finalBreedVotes || 1),
            )}
          </div>
          <VotesBarChart
            title="Glasovi po breed"
            counts={summary.breedCounts}
            totalVotes={summary.totalBreedCandidates}
            embedded
          />
        </div>
      </div>
    </div>
  );
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

export function UploadCard() {
  const inputRef = useRef(null);
  const topResultScrollRef = useRef(null);
  const resultScrollRef = useRef(null);
  const resultScrollContentRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultScrollWidth, setResultScrollWidth] = useState(0);
  const previewResponses = result ? [result, result] : [];

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    if (!result) {
      setResultScrollWidth(0);
      return;
    }

    const contentEl = resultScrollContentRef.current;
    if (!contentEl) return;

    const updateWidth = () => {
      setResultScrollWidth(contentEl.scrollWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateWidth);
    observer.observe(contentEl);

    return () => observer.disconnect();
  }, [result, previewResponses.length]);

  function syncHorizontalScroll(sourceEl, targetEl) {
    if (!sourceEl || !targetEl) return;
    if (targetEl.scrollLeft !== sourceEl.scrollLeft) {
      targetEl.scrollLeft = sourceEl.scrollLeft;
    }
  }

  function pickFile() {
    inputRef.current?.click();
  }

  function onFilesSelected(fileList) {
    if (!fileList?.length) return;

    const selected = Array.from(fileList);
    const invalid = selected.find((f) => !f.type.startsWith("image/"));

    if (invalid) {
      alert("Molim odaberi samo slike (jpg/png/webp...).");
      return;
    }

    setFiles((prevFiles) => [...prevFiles, ...selected]);
  }

  function onChange(e) {
    onFilesSelected(e.target.files);
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    onFilesSelected(e.dataTransfer.files);
  }

  function onDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function clear() {
    setFiles([]);
    setResult(null);
    setError("");
    setLoading(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function predict() {
    if (!files.length) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      files.forEach((file) => {
        form.append("images", file);
      });

      const resp = await fetch(`${API_BASE_URL}/api/predict`, {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setResult(data);
    } catch (e) {
      setError(e.message || "Došlo je do greške.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-3">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-gray-900">Upload images</h2>
          <p className="text-sm text-gray-600 mt-1">
            Odaberi više slika ili ih povuci u okvir. Sve slike šaljemo na
            backend za predikciju.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onChange}
          />

          <div
            onClick={pickFile}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            role="button"
            tabIndex={0}
            className={[
              "mt-5 rounded-xl border-2 border-dashed p-6 cursor-pointer select-none transition",
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:bg-gray-50",
            ].join(" ")}
          >
            {!files.length ? (
              <div className="text-center">
                <div className="text-sm font-medium text-gray-800">
                  Klikni za odabir slika
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ili povuci i pusti (JPG, PNG, WEBP)
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Odabrano slika: {files.length}
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                    >
                      <img
                        src={previewUrls[index]}
                        alt={file.name}
                        className="w-full h-28 object-cover"
                      />
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clear();
                    }}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    disabled={!files.length || loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      predict();
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Predicting..." : "Predict"}
                  </button>
                </div>

                <div className="text-xs text-gray-500 mt-3">
                  Tip: klikni “Clear” pa odaberi novi set slika.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            Backend endpoint vraća predikcije za prosleđeni niz slika.
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div
            ref={topResultScrollRef}
            onScroll={(e) =>
              syncHorizontalScroll(e.currentTarget, resultScrollRef.current)
            }
            className="overflow-x-auto mb-2"
            aria-label="Response horizontal scroll (top)"
          >
            <div
              className="h-3"
              style={{ width: resultScrollWidth ? `${resultScrollWidth}px` : "100%" }}
            />
          </div>

          <div
            ref={resultScrollRef}
            onScroll={(e) =>
              syncHorizontalScroll(e.currentTarget, topResultScrollRef.current)
            }
            className="overflow-x-auto pb-2"
          >
          <div ref={resultScrollContentRef} className="flex gap-4 w-max min-w-full">
            {previewResponses.map((response, responseIndex) => (
              <div
                key={`response-preview-${responseIndex}`}
                className="w-[min(92vw,1100px)] lg:w-[1100px] shrink-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Response #{responseIndex + 1}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    ok: {String(response.ok)}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    count: {response.count ?? 0}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    timing: {response.timing_ms ?? "-"} ms
                  </span>
                </div>

                {!!response.predictions?.length && (
                  <div className="space-y-4">
                    <BatchSummary predictions={response.predictions} />

                    {response.predictions.map((prediction) => (
                      <div
                        key={prediction.id}
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-sm text-gray-500">
                            Image #{prediction.id}
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {prediction.species || "unknown"}
                          </div>
                          <div className="text-sm text-gray-600">
                            species conf: {formatPercent(prediction.species_conf)}
                          </div>
                          <div className="text-sm text-gray-600">
                            breed: {prediction.breed || "-"}
                          </div>
                          <div className="text-sm text-gray-600">
                            breed conf: {formatPercent(prediction.breed_conf)}
                          </div>
                        </div>

                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                          <ProbabilityPieChart
                            title="Top species"
                            items={prediction.topk_species}
                            emptyLabel="Nema species rezultata"
                          />

                          <ProbabilityPieChart
                            title="Top breed"
                            items={prediction.topk_breed}
                            emptyLabel="Nema breed rezultata"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!!response.errors?.length && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div className="text-sm font-medium text-amber-800">
                      Backend errors
                    </div>
                    <ul className="mt-1 text-sm text-amber-700 list-disc pl-5 space-y-1">
                      {response.errors.map((item, idx) => (
                        <li key={`${item}-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
