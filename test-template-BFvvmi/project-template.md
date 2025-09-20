
# {{ project.name }}

## Description
{{ project.description }}

## Configuration
- **Environment**: {{ project.env }}
- **Version**: {{ project.version }}

## Dependencies
{% for dep in project.dependencies %}
- {{ dep.name }}@{{ dep.version }}
{% endfor %}
