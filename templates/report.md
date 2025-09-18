---
baseIRI: "https://example.org/"
queryName: "people"
entityType: "Person"
---

# People Report

## Summary
Total people: {{ people | length }}

## People List
{% for person in people %}
- **{{ person.name }}**: {{ person.age }} years old, lives in {{ person.city }}, works in {{ person.department }}, earns ${{ person.salary | number_format }}
{% endfor %}

## Statistics

### By Department
{% set departments = people | groupby('department') %}
{% for dept, deptPeople in departments %}
#### {{ dept }}
- Count: {{ deptPeople | length }}
- Average age: {{ deptPeople | avg('age') | round(1) }}
- Average salary: ${{ deptPeople | avg('salary') | round(0) | number_format }}
{% endfor %}

### Overall Statistics
- Average age: {{ people | avg('age') | round(1) }}
- Average salary: ${{ people | avg('salary') | round(0) | number_format }}
- Oldest person: {{ people | max('age') }} years
- Youngest person: {{ people | min('age') }} years
- Highest salary: ${{ people | max('salary') | number_format }}
- Lowest salary: ${{ people | min('salary') | number_format }}

### By City
{% set cities = people | groupby('city') %}
{% for city, cityPeople in cities %}
- **{{ city }}**: {{ cityPeople | length }} people
{% endfor %}





