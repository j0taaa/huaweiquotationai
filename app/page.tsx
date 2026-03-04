import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoProjects, demoSteps } from "@/lib/mock-data";

const STATUS_STYLES: Record<string, "default" | "secondary" | "outline"> = {
  in_progress: "default",
  draft: "secondary",
  completed: "outline",
};

export default function Home() {
  const completed = demoSteps.filter((step) => step.status === "completed").length;
  const progress = Math.round((completed / demoSteps.length) * 100);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 md:p-10">
      <section className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Huawei Quotation AI Studio
        </h1>
        <p className="text-muted-foreground">
          Build cloud-migration quotations step-by-step from AWS, Azure, GCP, or
          on-premise inventories into Huawei Cloud calculator-ready proposals.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {demoProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>{project.name}</CardTitle>
                <Badge variant={STATUS_STYLES[project.status] ?? "outline"}>
                  {project.status.replace("_", " ")}
                </Badge>
              </div>
              <CardDescription>
                Source: {project.source_environment} • {demoSteps.length} pipeline steps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">{progress}% completed</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href={`/projects/${project.id}`}>Open project</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>
    </main>
  );
}
