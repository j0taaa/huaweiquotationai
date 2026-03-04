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
import { demoProjects, demoSteps } from "@/lib/mock-data";

type Props = {
  params: Promise<{ id: string; stepId: string }>;
};

const activityStyles: Record<string, "default" | "secondary" | "destructive"> = {
  info: "secondary",
  success: "default",
  warning: "destructive",
};

const toolStyles: Record<string, "default" | "secondary" | "outline"> = {
  running: "default",
  completed: "secondary",
  queued: "outline",
};

export default async function StepInspectionPage({ params }: Props) {
  const { id, stepId } = await params;
  const project = demoProjects.find((item) => item.id === id);
  const step = demoSteps.find((item) => item.id === stepId);

  if (!project || !step) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project.name}</p>
          <h1 className="text-2xl font-semibold">
            Step {step.step_order}: {step.step_name}
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent configuration</CardTitle>
            <CardDescription>Snapshot of the agent profile for this stage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Agent:</span> {step.agent_profile}
            </p>
            <p>
              <span className="font-medium">Goal:</span> {step.agent_goal}
            </p>
            <p>
              <span className="font-medium">Input:</span> {step.input_summary}
            </p>
            <p>
              <span className="font-medium">Expected output:</span> {step.output_summary}
            </p>
            <p>
              <span className="font-medium">System prompt guidance:</span>{" "}
              {step.system_prompt_summary}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
            <CardDescription>Live overview of this step execution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Step state:</span>
              <Badge variant="outline">{step.status.replace("_", " ")}</Badge>
            </div>
            <p>
              <span className="font-medium">Tools registered:</span> {step.tools.length}
            </p>
            <p>
              <span className="font-medium">Activity events:</span> {step.activities.length}
            </p>
            <p className="text-muted-foreground">
              This is a base observability view. In future iterations it can stream real-time logs and tool outputs.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Tool calls</CardTitle>
            <CardDescription>Each call made (or queued) by the step agent.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Timestamp (UTC)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {step.tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell>{tool.toolName}</TableCell>
                    <TableCell>{tool.purpose}</TableCell>
                    <TableCell>{tool.timestamp}</TableCell>
                    <TableCell>
                      <Badge variant={toolStyles[tool.status] ?? "outline"}>{tool.status}</Badge>
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
            <CardTitle>Agent activity log</CardTitle>
            <CardDescription>Human-readable log trail for this step.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {step.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <Badge variant={activityStyles[activity.level] ?? "secondary"}>{activity.level}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
