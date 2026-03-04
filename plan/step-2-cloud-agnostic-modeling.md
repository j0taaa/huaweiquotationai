# Step 2 - Cloud-Agnostic Modeling

## Purpose
Convert normalized source information into a provider-neutral model of workloads and services.

## Inputs
- Step 1 staging tables.
- Extracted document chunks and metadata.

## Agent Responsibilities
- Run SQL-based analysis on staged infrastructure data.
- Detect service archetypes (VM, relational DB, object storage, network, etc.).
- Infer performance/security constraints from text docs.
- Build canonical objects with clear schema and provenance.

## Example Output Object (VM)
- service_type: VM
- source_provider_service: EC2
- machine_name
- vcpu
- memory_gb
- gpu_profile
- operating_system
- storage_requirements
- extra_capabilities

## Outputs
- Versioned cloud-agnostic catalog for the project.
- Mapping hints and unresolved ambiguity list.
