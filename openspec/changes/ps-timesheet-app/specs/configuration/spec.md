# Spec Delta

## Purpose
Provides user and project configuration management loaded from local YAML files on the host filesystem.

## ADDED Requirements

### Requirement: Load Configuration File
The system SHALL load application and project configurations from `~/.pstimesheet.yaml` on startup. If the file is missing, the system SHALL initialize a default configuration template.

#### Scenario: Existing configuration file
- **WHEN** the application starts up and `~/.pstimesheet.yaml` exists
- **THEN** project definitions including name, basePath, template type, and default tasks are parsed and loaded into memory

#### Scenario: Missing configuration file initialization
- **WHEN** the application starts up and `~/.pstimesheet.yaml` does not exist
- **THEN** a default configuration file with sample project definitions is created in the user home directory

### Requirement: Manage Projects in Configuration
The system SHALL provide capabilities to read, create, and update project configurations persisted to `~/.pstimesheet.yaml`.

#### Scenario: Add new project
- **WHEN** a user creates a new project with name, base path, template type, and default tasks
- **THEN** the project is added to `~/.pstimesheet.yaml` and becomes immediately available in the application

#### Scenario: Update existing project
- **WHEN** a user modifies an existing project's base path, template, or default tasks
- **THEN** the updated project configuration is saved back to `~/.pstimesheet.yaml`
