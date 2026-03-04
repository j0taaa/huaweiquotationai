# Step 3 - Huawei Mapping

## Purpose
Translate cloud-agnostic objects into Huawei Cloud-compatible service selections.

## Inputs
- Cloud-agnostic objects from Step 2.
- Huawei service/flavor reference catalog.

## Agent Responsibilities
- Match each canonical object to Huawei service families.
- Select candidate flavors/sizes based on requirements.
- Track assumption logs and fallback alternatives.
- Flag unsupported features that require manual intervention.

## Outputs
- Huawei-ready object list (e.g., ECS flavor, EVS disk class, RDS engine/tier).
- Candidate alternatives for cost/performance scenarios.
- Mapping confidence and rationale metadata.
