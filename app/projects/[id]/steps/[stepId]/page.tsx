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
import { StepIntakeForm } from "@/components/step-intake-form";
import { StepChatPanel } from "@/components/step-chat-panel";
import { listStepIntakeItems } from "@/lib/intake";
import { demoProjects, demoSteps } from "@/lib/mock-data";
import { ensureProjectWorkspace } from "@/lib/workspace";

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
  const intakeItems = await listStepIntakeItems(id, stepId);

  if (!project || !step) {
    notFound();
  }

  ensureProjectWorkspace(
    project.id,
    demoSteps.map((item) => item.id),
  );

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
              <span className="font-medium">Goal:</span>{" "}
              {step.agent_goal}
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

      {step.step_order === 1 ? (
        <section className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Intake submission</CardTitle>
              <CardDescription>
                Send source files and/or free text. Items are stored under project and step input folders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <StepIntakeForm projectId={project.id} stepId={step.id} />

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Stored intake items</h3>
                {intakeItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No intake submissions yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Size (bytes)</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {intakeItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_type}</TableCell>
                          <TableCell>{item.original_name ?? item.stored_name}</TableCell>
                          <TableCell>{item.byte_size}</TableCell>
                          <TableCell>{item.created_at}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Step agent chat</CardTitle>
            <CardDescription>
              Chat with this step&apos;s LLM agent to inspect reasoning and outputs before automation is finalized.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StepChatPanel projectId={project.id} stepId={step.id} />
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
