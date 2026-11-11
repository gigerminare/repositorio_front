import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT))

from tools.spec_verification_gate import validate_report


GATE_SCRIPT = REPOSITORY_ROOT / "tools" / "spec_verification_gate.py"


class SpecVerificationGateTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.workspace = Path(self.temporary_directory.name)
        self.spec_relative = "repositorio_front/docs/spec.md"
        self.report_relative = "repositorio_front/verification/spec.json"
        self.source_relative = "repositorio_front/src/example.py"
        self.spec_path = self.workspace / self.spec_relative
        self.report_path = self.workspace / self.report_relative
        self.source_path = self.workspace / self.source_relative
        self.spec_path.parent.mkdir(parents=True)
        self.report_path.parent.mkdir(parents=True)
        self.source_path.parent.mkdir(parents=True)
        self.spec_path.write_text(
            "# Example\n- CA-01: The example limit is five.\n"
            "- CA-02: The example has a source file.\n",
            encoding="utf-8",
        )
        self.source_path.write_text("LIMIT = 5\n", encoding="utf-8")

    def tearDown(self):
        self.temporary_directory.cleanup()

    def evidence(self, observation):
        return [
            {
                "kind": "file",
                "path": self.source_relative,
                "lines": [1, 1],
                "observation": observation,
            }
        ]

    def report(self, first_result="PASS", first_evidence=None):
        first_evidence = (
            self.evidence("A linha 1 define o limite esperado.")
            if first_evidence is None
            else first_evidence
        )
        return {
            "format_version": 1,
            "spec_path": self.spec_relative,
            "criteria": [
                {
                    "id": "CA-01",
                    "criterion": "The example limit is five.",
                    "result": first_result,
                    "evidence": first_evidence,
                },
                {
                    "id": "CA-02",
                    "criterion": "The example has a source file.",
                    "result": "PASS",
                    "evidence": self.evidence("O arquivo de exemplo existe."),
                },
            ],
            "summary": {
                "pass": 2 if first_result == "PASS" else 1,
                "fail": 0 if first_result == "PASS" else 1,
            },
        }

    def write_report(self, report):
        self.report_path.write_text(json.dumps(report), encoding="utf-8")

    def run_cli(self):
        return subprocess.run(
            [
                sys.executable,
                str(GATE_SCRIPT),
                "--spec",
                self.spec_relative,
                "--report",
                self.report_relative,
                "--workspace-root",
                str(self.workspace),
            ],
            cwd=REPOSITORY_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_complete_report_with_existing_evidence_passes(self):
        self.write_report(self.report())

        result = self.run_cli()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("todos os 2 critério(s)", result.stdout)

    def test_missing_report_blocks_completion(self):
        errors, pass_count, fail_count = validate_report(
            self.workspace, self.spec_relative, self.report_relative
        )

        self.assertTrue(any("relatório ausente" in error for error in errors))
        self.assertEqual((pass_count, fail_count), (0, 0))

    def test_planted_error_is_reported_as_fail_and_blocks_gate(self):
        self.source_path.write_text("LIMIT = 3  # planted error\n", encoding="utf-8")
        report = self.report(
            first_result="FAIL",
            first_evidence=[
                {
                    "kind": "file",
                    "path": self.source_relative,
                    "lines": [1, 1],
                    "observation": "A linha 1 define LIMIT como 3, não cinco.",
                }
            ],
        )
        self.write_report(report)

        result = self.run_cli()

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("1 critério(s) reprovado(s)", result.stdout)
        self.assertIn("LIMIT = 3", self.source_path.read_text(encoding="utf-8"))

    def test_criterion_without_evidence_is_blocked(self):
        report = self.report(first_evidence=[])
        self.write_report(report)

        errors, _, _ = validate_report(
            self.workspace, self.spec_relative, self.report_relative
        )

        self.assertTrue(any("evidência ausente" in error for error in errors))

    def test_pass_cannot_use_only_missing_evidence(self):
        missing_evidence = [
            {
                "kind": "missing",
                "path": "repositorio_front/src/not-created.py",
                "lines": None,
                "observation": "O arquivo esperado não foi encontrado.",
            }
        ]
        report = self.report(first_evidence=missing_evidence)
        self.write_report(report)

        errors, _, _ = validate_report(
            self.workspace, self.spec_relative, self.report_relative
        )

        self.assertTrue(
            any("PASS exige evidência de arquivo existente" in error for error in errors)
        )

    def test_report_with_stale_criterion_text_is_blocked(self):
        self.spec_path.write_text(
            "# Example\n- CA-01: The example limit is six.\n"
            "- CA-02: The example has a source file.\n",
            encoding="utf-8",
        )
        self.write_report(self.report())

        errors, _, _ = validate_report(
            self.workspace, self.spec_relative, self.report_relative
        )

        self.assertTrue(any("texto diverge da spec" in error for error in errors))

    def test_report_paths_cannot_escape_workspace(self):
        with self.assertRaisesRegex(ValueError, "fora do workspace"):
            from tools.spec_verification_gate import workspace_path

            workspace_path(self.workspace, "../outside.json")

    def test_criterion_wrapped_over_several_lines_is_read_whole(self):
        self.spec_path.write_text(
            "# Example\n- CA-01: The example limit\n  is five.\n"
            "- CA-02: The example has a source file.\n",
            encoding="utf-8",
        )
        from tools.spec_verification_gate import extract_criteria

        self.assertEqual(
            extract_criteria(self.spec_path.read_text(encoding="utf-8")),
            [
                ("CA-01", "The example limit is five."),
                ("CA-02", "The example has a source file."),
            ],
        )

    def test_gate_is_read_only(self):
        self.write_report(self.report())
        before = {
            path: path.read_bytes()
            for path in (self.spec_path, self.report_path, self.source_path)
        }

        validate_report(self.workspace, self.spec_relative, self.report_relative)

        after = {
            path: path.read_bytes()
            for path in (self.spec_path, self.report_path, self.source_path)
        }
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
