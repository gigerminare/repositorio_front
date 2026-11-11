import re
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
AGENT_FILE = REPOSITORY_ROOT / ".github" / "agents" / "spec-verifier.agent.md"


class SpecVerifierConfigurationTests(unittest.TestCase):
    def test_agent_has_only_read_and_search_tools(self):
        content = AGENT_FILE.read_text(encoding="utf-8")
        frontmatter = content.split("---", 2)[1]
        match = re.search(r"(?m)^tools:\s*\[([^\]]*)\]\s*$", frontmatter)

        self.assertIsNotNone(match)
        tools = [tool.strip() for tool in match.group(1).split(",")]
        self.assertEqual(tools, ["read", "search"])

    def test_agent_cannot_delegate_or_use_other_agents(self):
        content = AGENT_FILE.read_text(encoding="utf-8")
        frontmatter = content.split("---", 2)[1]

        self.assertRegex(frontmatter, r"(?m)^agents:\s*\[\]\s*$")
        self.assertNotRegex(
            frontmatter,
            r"(?i)\b(edit|execute|agent|web|terminal|github-mcp-server)\b",
        )

    def test_agent_requires_independent_evidence_and_never_repairs(self):
        content = AGENT_FILE.read_text(encoding="utf-8")
        normalized_content = " ".join(content.split())

        self.assertIn("contexto limpo", content)
        self.assertIn("Nunca edite código, testes ou documentação", content)
        self.assertIn("Devolva todas as falhas ao agente principal", normalized_content)
        self.assertIn("evidência existente", content)


if __name__ == "__main__":
    unittest.main()
