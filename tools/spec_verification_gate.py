#!/usr/bin/env python3
"""Fail-closed validation of a read-only spec-verifier report."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


CRITERION_PATTERN = re.compile(r"^\s*[-*]\s*(CA-\d+):\s*(.*?)\s*$")
REPORT_KEYS = {"format_version", "spec_path", "criteria", "summary"}
CRITERION_KEYS = {"id", "criterion", "result", "evidence"}
EVIDENCE_KEYS = {"kind", "path", "lines", "observation"}


def workspace_path(root: Path, value: Any) -> Path:
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("caminho deve ser relativo e usar barras '/'")

    relative = PurePosixPath(value)
    if relative.is_absolute() or PureWindowsPath(value).drive or ".." in relative.parts:
        raise ValueError("caminho absoluto ou fora do workspace não é permitido")

    resolved_root = root.resolve()
    resolved_path = resolved_root.joinpath(*relative.parts).resolve()
    try:
        resolved_path.relative_to(resolved_root)
    except ValueError as exc:
        raise ValueError("caminho escapa do workspace") from exc
    return resolved_path


def extract_criteria(spec_text: str) -> list[tuple[str, str]]:
    criteria: list[tuple[str, str]] = []
    seen: set[str] = set()
    current_id: str | None = None
    parts: list[str] = []

    def close() -> None:
        nonlocal current_id, parts
        if current_id is None:
            return
        text = " ".join(parts).strip()
        if not text:
            raise ValueError(f"critério sem descrição na spec: {current_id}")
        criteria.append((current_id, text))
        current_id, parts = None, []

    for line in spec_text.splitlines():
        match = CRITERION_PATTERN.match(line)
        if match:
            close()
            criterion_id, criterion_text = match.groups()
            if criterion_id in seen:
                raise ValueError(f"critério duplicado na spec: {criterion_id}")
            seen.add(criterion_id)
            current_id, parts = criterion_id, [criterion_text]
        elif current_id is not None and line.strip() and line[:1].isspace():
            # linha de continuação (indentada) do mesmo critério
            parts.append(line.strip())
        else:
            close()
    close()
    if not criteria:
        raise ValueError("a spec não contém critérios no formato '- CA-xx: texto'")
    return criteria


def _validate_evidence(
    evidence: Any,
    result: str,
    workspace_root: Path,
    criterion_id: str,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(evidence, list) or not evidence:
        return [f"{criterion_id}: evidência ausente"]

    has_file = False
    for index, item in enumerate(evidence, start=1):
        prefix = f"{criterion_id}: evidência {index}"
        if not isinstance(item, dict) or set(item) != EVIDENCE_KEYS:
            errors.append(f"{prefix}: formato inválido")
            continue
        kind = item["kind"]
        observation = item["observation"]
        if not isinstance(observation, str) or len(observation.strip()) < 8:
            errors.append(f"{prefix}: observação objetiva obrigatória")
            continue
        try:
            path = workspace_path(workspace_root, item["path"])
        except ValueError as exc:
            errors.append(f"{prefix}: {exc}")
            continue

        if kind == "file":
            has_file = True
            lines = item["lines"]
            if not path.is_file():
                errors.append(f"{prefix}: arquivo de evidência não existe")
                continue
            if (
                not isinstance(lines, list)
                or len(lines) != 2
                or any(type(number) is not int or number < 1 for number in lines)
                or lines[1] < lines[0]
            ):
                errors.append(f"{prefix}: intervalo de linhas inválido")
                continue
            try:
                line_count = len(path.read_text(encoding="utf-8").splitlines())
            except (OSError, UnicodeDecodeError) as exc:
                errors.append(f"{prefix}: não foi possível ler o arquivo: {exc}")
                continue
            if lines[1] > line_count:
                errors.append(f"{prefix}: linhas apontam além do fim do arquivo")
        elif kind == "missing":
            if item["lines"] is not None:
                errors.append(f"{prefix}: evidência missing deve usar lines: null")
            if path.exists():
                errors.append(f"{prefix}: o caminho declarado como ausente existe")
        else:
            errors.append(f"{prefix}: kind deve ser 'file' ou 'missing'")

    if result == "PASS" and not has_file:
        errors.append(f"{criterion_id}: PASS exige evidência de arquivo existente")
    return errors


def validate_report(
    workspace_root: Path,
    spec_value: str,
    report_value: str,
) -> tuple[list[str], int, int]:
    errors: list[str] = []
    try:
        spec_path = workspace_path(workspace_root, spec_value)
        report_path = workspace_path(workspace_root, report_value)
    except ValueError as exc:
        return [str(exc)], 0, 0

    if not spec_path.is_file():
        return [f"spec não encontrada: {spec_value}"], 0, 0
    if not report_path.is_file():
        return [f"spec ainda não verificada: relatório ausente em {report_value}"], 0, 0

    try:
        spec_text = spec_path.read_text(encoding="utf-8")
        expected_criteria = extract_criteria(spec_text)
    except (OSError, UnicodeDecodeError, ValueError) as exc:
        return [f"spec inválida: {exc}"], 0, 0

    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        return [f"relatório JSON inválido: {exc}"], 0, 0

    if not isinstance(report, dict) or set(report) != REPORT_KEYS:
        return ["relatório deve conter exatamente os campos padronizados"], 0, 0
    if type(report["format_version"]) is not int or report["format_version"] != 1:
        errors.append("format_version deve ser o inteiro 1")
    expected_spec_path = spec_path.relative_to(workspace_root.resolve()).as_posix()
    if report["spec_path"] != expected_spec_path:
        errors.append("spec_path do relatório não corresponde à spec verificada")

    report_criteria = report["criteria"]
    if not isinstance(report_criteria, list):
        return errors + ["criteria deve ser uma lista"], 0, 0
    expected_ids = [criterion_id for criterion_id, _ in expected_criteria]
    actual_ids = [
        item.get("id") if isinstance(item, dict) else None for item in report_criteria
    ]
    if actual_ids != expected_ids:
        errors.append("critérios ausentes, excedentes ou fora da ordem da spec")

    pass_count = 0
    fail_count = 0
    for index, (criterion_id, criterion_text) in enumerate(expected_criteria):
        if index >= len(report_criteria):
            continue
        item = report_criteria[index]
        if not isinstance(item, dict) or set(item) != CRITERION_KEYS:
            errors.append(f"{criterion_id}: formato do resultado inválido")
            continue
        if item["id"] != criterion_id or item["criterion"] != criterion_text:
            errors.append(f"{criterion_id}: id ou texto diverge da spec")
        result = item["result"]
        if result not in ("PASS", "FAIL"):
            errors.append(f"{criterion_id}: result deve ser PASS ou FAIL")
            continue
        if result == "PASS":
            pass_count += 1
        else:
            fail_count += 1
        errors.extend(
            _validate_evidence(item["evidence"], result, workspace_root, criterion_id)
        )

    summary = report["summary"]
    if not isinstance(summary, dict) or set(summary) != {"pass", "fail"}:
        errors.append("summary deve conter somente os totais pass e fail")
    elif (
        type(summary["pass"]) is not int
        or type(summary["fail"]) is not int
        or summary["pass"] != pass_count
        or summary["fail"] != fail_count
    ):
        errors.append("totais do summary não correspondem aos resultados")

    return errors, pass_count, fail_count


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", required=True, help="spec relativa ao workspace")
    parser.add_argument("--report", required=True, help="relatório JSON relativo ao workspace")
    parser.add_argument(
        "--workspace-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
        help="pasta comum dos repositórios (padrão: pai do repositório atual)",
    )
    args = parser.parse_args(argv)

    errors, pass_count, fail_count = validate_report(
        args.workspace_root, args.spec, args.report
    )
    if errors:
        print("BLOQUEADO: " + "; ".join(errors), file=sys.stderr)
        return 2
    if fail_count:
        print(f"FAIL: {fail_count} critério(s) reprovado(s); {pass_count} aprovado(s).")
        return 1
    print(f"PASS: todos os {pass_count} critério(s) têm evidência válida.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
