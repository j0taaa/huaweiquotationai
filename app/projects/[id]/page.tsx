import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectFileIntakeForm } from "@/components/project-file-intake-form";
import { demoProjects, demoQuotations, demoSteps } from "@/lib/mock-data";
import { ensureProjectWorkspace } from "@/lib/workspace";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const project = demoProjects.find((item) => item.id === id);

  if (!project) {
    notFound();
  }

  ensureProjectWorkspace(
    project.id,
    demoSteps.map((item) => item.id),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-muted-foreground">
            Source environment: {project.source_environment}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload source files</CardTitle>
            <CardDescription>
              Upload files to be processed by the first step agent (Ingestion & normalization).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectFileIntakeForm projectId={project.id} />
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline steps</CardTitle>
            <CardDescription>
              Open each step to inspect what the agent is doing and which tools it is using.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tools</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoSteps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell>{step.step_order}</TableCell>
                    <TableCell>{step.step_name}</TableCell>
                    <TableCell>{step.agent_profile}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{step.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>{step.tools.length}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/projects/${project.id}/steps/${step.id}`}>Inspect step</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Generated quotations</CardTitle>
            <CardDescription>
              One project can produce multiple Huawei pricing scenarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Estimated monthly cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell>{quotation.quotation_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{quotation.status.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {quotation.currency} {quotation.estimated_monthly_cost.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
