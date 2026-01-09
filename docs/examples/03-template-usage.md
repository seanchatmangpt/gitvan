# Example 3: Template Usage

This example demonstrates using GitVan's template system (Nunjucks) for code generation and automation.

## Scenario: Component Generator

Create a system that generates React components from templates with consistent structure and boilerplate.

## Template Definitions

### Component Template

Create `.gitvan/templates/react-component.njk`:

```javascript
import React{% if typescript %}, { FC }{% endif %} from 'react';
{% if useStyles %}
import styles from './{{ name }}.module.css';
{% endif %}
{% if propTypes %}
import PropTypes from 'prop-types';
{% endif %}

{% if typescript %}
interface {{ name }}Props {
  {% for prop in props %}
  {{ prop.name }}{% if prop.optional %}?{% endif %}: {{ prop.type }};
  {% endfor %}
}
{% endif %}

{% if typescript %}
export const {{ name }}: FC<{{ name }}Props> = ({ {{ props | map(attribute='name') | join(', ') }} }) => {
{% else %}
export const {{ name }} = ({ {{ props | map(attribute='name') | join(', ') }} }) => {
{% endif %}
  return (
    <div {% if useStyles %}className={styles.container}{% else %}className="{{ name | lower }}"{% endif %}>
      <h2>{title}</h2>
      {% if hasChildren %}
      {children}
      {% endif %}
    </div>
  );
};

{% if propTypes and not typescript %}
{{ name }}.propTypes = {
  {% for prop in props %}
  {{ prop.name }}: PropTypes.{{ prop.type }}{% if prop.required %}.isRequired{% endif %},
  {% endfor %}
};
{% endif %}

{% if defaultProps %}
{{ name }}.defaultProps = {
  {% for key, value in defaultProps %}
  {{ key }}: {{ value | dump }},
  {% endfor %}
};
{% endif %}
```

### Test Template

Create `.gitvan/templates/react-component-test.njk`:

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { {{ name }} } from './{{ name }}';

describe('{{ name }}', () => {
  it('should render without crashing', () => {
    render(<{{ name }} {% for prop in requiredProps %}{{ prop.name }}="{{ prop.value }}" {% endfor %}/>);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  {% for prop in props %}
  it('should display {{ prop.name }} prop', () => {
    const {{ prop.name }} = '{{ prop.testValue }}';
    render(<{{ name }} {{ prop.name }}={ {{ prop.name }} } />);
    expect(screen.getByText({{ prop.name }})).toBeInTheDocument();
  });
  {% endfor %}

  {% if hasEvents %}
  {% for event in events %}
  it('should call {{ event }} handler', () => {
    const handler = jest.fn();
    render(<{{ name }} {{ event }}={handler} />);

    // Trigger event
    // screen.getByRole('button').click();

    expect(handler).toHaveBeenCalled();
  });
  {% endfor %}
  {% endif %}
});
```

### Styles Template

Create `.gitvan/templates/react-component-styles.njk`:

```css
.container {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  {% if theme %}
  background-color: var(--{{ theme }}-bg);
  color: var(--{{ theme }}-text);
  {% endif %}
}

{% for className in classNames %}
.{{ className }} {
  /* Add styles for {{ className }} */
}
{% endfor %}
```

## Generator Script

Create `generate-component.mjs`:

```javascript
import { withGitVan, useTemplate, useFileSystem } from 'gitvan';
import { join } from 'path';

const context = {
  repo: process.cwd(),
  config: {}
};

async function generateComponent(config) {
  await withGitVan(context, async () => {
    const template = useTemplate();
    const fs = useFileSystem();

    const {
      name,
      props = [],
      typescript = false,
      useStyles = true,
      propTypes = true,
      hasChildren = false,
      defaultProps = {},
      events = []
    } = config;

    console.log(`Generating component: ${name}`);

    // Output directory
    const outputDir = join('src', 'components', name);
    await fs.mkdir(outputDir, { recursive: true });

    // 1. Generate component
    const componentExt = typescript ? 'tsx' : 'jsx';
    const componentPath = join(outputDir, `${name}.${componentExt}`);

    const componentCode = await template.render('react-component.njk', {
      name,
      props,
      typescript,
      useStyles,
      propTypes,
      hasChildren,
      defaultProps,
      events
    });

    await fs.write(componentPath, componentCode);
    console.log(`✓ Created ${componentPath}`);

    // 2. Generate test
    const testPath = join(outputDir, `${name}.test.${componentExt}`);

    const testCode = await template.render('react-component-test.njk', {
      name,
      props,
      requiredProps: props.filter(p => p.required),
      hasEvents: events.length > 0,
      events
    });

    await fs.write(testPath, testCode);
    console.log(`✓ Created ${testPath}`);

    // 3. Generate styles (if enabled)
    if (useStyles) {
      const stylesPath = join(outputDir, `${name}.module.css`);

      const stylesCode = await template.render('react-component-styles.njk', {
        classNames: ['container', 'header', 'content']
      });

      await fs.write(stylesPath, stylesCode);
      console.log(`✓ Created ${stylesPath}`);
    }

    // 4. Generate index file
    const indexPath = join(outputDir, 'index.js');
    await fs.write(indexPath, `export { ${name} } from './${name}';\n`);
    console.log(`✓ Created ${indexPath}`);

    console.log(`\n✓ Component ${name} generated successfully!`);
    console.log(`Location: ${outputDir}`);
  });
}

// Component configuration
const config = {
  name: 'UserCard',
  typescript: false,
  useStyles: true,
  propTypes: true,
  hasChildren: false,
  props: [
    {
      name: 'user',
      type: 'object',
      required: true,
      testValue: '{ name: "John", email: "john@example.com" }'
    },
    {
      name: 'onEdit',
      type: 'func',
      required: false,
      testValue: 'jest.fn()'
    },
    {
      name: 'onDelete',
      type: 'func',
      required: false,
      testValue: 'jest.fn()'
    }
  ],
  defaultProps: {
    showActions: true,
    theme: 'light'
  },
  events: ['onEdit', 'onDelete']
};

await generateComponent(config);
```

## Usage

```bash
node generate-component.mjs
```

Output:
```
Generating component: UserCard
✓ Created src/components/UserCard/UserCard.jsx
✓ Created src/components/UserCard/UserCard.test.jsx
✓ Created src/components/UserCard/UserCard.module.css
✓ Created src/components/UserCard/index.js

✓ Component UserCard generated successfully!
Location: src/components/UserCard
```

Generated files:
```
src/components/UserCard/
├── UserCard.jsx
├── UserCard.test.jsx
├── UserCard.module.css
└── index.js
```

## Template Operations

### Custom Filters

Add custom Nunjucks filters:

```javascript
import { withGitVan, useTemplate } from 'gitvan';

await withGitVan(context, async () => {
  const template = useTemplate();

  // Add custom filters
  template.addFilter('camelCase', (str) => {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  });

  template.addFilter('pascalCase', (str) => {
    return str
      .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
      .replace(/^[a-z]/, (g) => g.toUpperCase());
  });

  template.addFilter('kebabCase', (str) => {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  });

  template.addFilter('snakeCase', (str) => {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  });

  // Use in template
  // {{ "user-profile" | camelCase }}  -> userProfile
  // {{ "user-profile" | pascalCase }} -> UserProfile
  // {{ "UserProfile" | kebabCase }}   -> user-profile
  // {{ "UserProfile" | snakeCase }}   -> user_profile
});
```

### Global Variables

Set global variables available in all templates:

```javascript
const template = useTemplate();

template.addGlobal('projectName', 'My Project');
template.addGlobal('version', '1.0.0');
template.addGlobal('author', 'John Doe');
template.addGlobal('year', new Date().getFullYear());

// Available in all templates without passing data
// {{ projectName }} v{{ version }}
// Copyright {{ year }} {{ author }}
```

### Template Inheritance

Base template `.gitvan/templates/base-component.njk`:

```javascript
import React from 'react';

{% block imports %}
// Additional imports
{% endblock %}

export const {{ name }} = ({% block props %}{ children }{% endblock %}) => {
  {% block state %}
  // Component state
  {% endblock %}

  {% block effects %}
  // Effects
  {% endblock %}

  {% block handlers %}
  // Event handlers
  {% endblock %}

  return (
    {% block render %}
    <div>
      {children}
    </div>
    {% endblock %}
  );
};

{% block exports %}
{% endblock %}
```

Extended template `.gitvan/templates/form-component.njk`:

```javascript
{% extends "base-component.njk" %}

{% block imports %}
import { useState } from 'react';
{% endblock %}

{% block props %}
{ onSubmit, initialValues }
{% endblock %}

{% block state %}
const [values, setValues] = useState(initialValues);
const [errors, setErrors] = useState({});
{% endblock %}

{% block handlers %}
const handleChange = (e) => {
  setValues({ ...values, [e.target.name]: e.target.value });
};

const handleSubmit = (e) => {
  e.preventDefault();
  onSubmit(values);
};
{% endblock %}

{% block render %}
<form onSubmit={handleSubmit}>
  {/* Form fields */}
  <button type="submit">Submit</button>
</form>
{% endblock %}
```

### Macros for Reusability

Create `.gitvan/templates/macros.njk`:

```javascript
{% macro input(name, type='text', label='', required=false) %}
<div className="form-group">
  {% if label %}
  <label htmlFor="{{ name }}">{{ label }}{% if required %}*{% endif %}</label>
  {% endif %}
  <input
    type="{{ type }}"
    id="{{ name }}"
    name="{{ name }}"
    {% if required %}required{% endif %}
  />
</div>
{% endmacro %}

{% macro button(text, variant='primary', type='button') %}
<button
  type="{{ type }}"
  className="btn btn-{{ variant }}"
>
  {{ text }}
</button>
{% endmacro %}
```

Use macros in templates:

```javascript
{% from "macros.njk" import input, button %}

<form>
  {{ input('email', 'email', 'Email Address', true) }}
  {{ input('password', 'password', 'Password', true) }}
  {{ button('Login', 'primary', 'submit') }}
</form>
```

## Advanced Example: API Endpoint Generator

Create `.gitvan/templates/api-endpoint.njk`:

```javascript
import express from 'express';
{% if useValidation %}
import { body, validationResult } from 'express-validator';
{% endif %}
{% if useAuth %}
import { authenticate } from '../middleware/auth';
{% endif %}

const router = express.Router();

{% for endpoint in endpoints %}
/**
 * {{ endpoint.description }}
 * @route {{ endpoint.method }} {{ endpoint.path }}
 {% if endpoint.auth %}
 * @access Private
 {% else %}
 * @access Public
 {% endif %}
 */
router.{{ endpoint.method | lower }}(
  '{{ endpoint.path }}',
  {% if endpoint.auth %}authenticate,{% endif %}
  {% if endpoint.validation %}
  [
    {% for rule in endpoint.validation %}
    body('{{ rule.field }}'){% for method in rule.methods %}.{{ method }}(){% endfor %},
    {% endfor %}
  ],
  {% endif %}
  async (req, res) => {
    try {
      {% if endpoint.validation %}
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      {% endif %}

      {% if endpoint.method == 'GET' %}
      // Fetch data
      const data = await {{ endpoint.model }}.find(req.query);
      res.json(data);
      {% elif endpoint.method == 'POST' %}
      // Create new resource
      const {{ endpoint.model | lower }} = await {{ endpoint.model }}.create(req.body);
      res.status(201).json({{ endpoint.model | lower }});
      {% elif endpoint.method == 'PUT' or endpoint.method == 'PATCH' %}
      // Update resource
      const {{ endpoint.model | lower }} = await {{ endpoint.model }}.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      res.json({{ endpoint.model | lower }});
      {% elif endpoint.method == 'DELETE' %}
      // Delete resource
      await {{ endpoint.model }}.findByIdAndDelete(req.params.id);
      res.status(204).send();
      {% endif %}
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

{% endfor %}

export default router;
```

Generate API endpoints:

```javascript
import { withGitVan, useTemplate, useFileSystem } from 'gitvan';

await withGitVan(context, async () => {
  const template = useTemplate();
  const fs = useFileSystem();

  const code = await template.render('api-endpoint.njk', {
    useValidation: true,
    useAuth: true,
    endpoints: [
      {
        method: 'GET',
        path: '/users',
        description: 'Get all users',
        model: 'User',
        auth: true
      },
      {
        method: 'POST',
        path: '/users',
        description: 'Create new user',
        model: 'User',
        auth: true,
        validation: [
          {
            field: 'email',
            methods: ['isEmail', 'normalizeEmail']
          },
          {
            field: 'password',
            methods: ['isLength({ min: 8 })']
          }
        ]
      },
      {
        method: 'GET',
        path: '/users/:id',
        description: 'Get user by ID',
        model: 'User',
        auth: true
      },
      {
        method: 'PUT',
        path: '/users/:id',
        description: 'Update user',
        model: 'User',
        auth: true
      },
      {
        method: 'DELETE',
        path: '/users/:id',
        description: 'Delete user',
        model: 'User',
        auth: true
      }
    ]
  });

  await fs.write('src/routes/users.js', code);
  console.log('✓ API endpoints generated');
});
```

## Template CLI Integration

Integrate with GitVan CLI:

```bash
# Render template
gitvan template render react-component.njk \
  --data '{"name":"UserCard","props":[{"name":"user","type":"object"}]}' \
  --output src/components/UserCard.jsx

# List templates
gitvan template list

# Validate template
gitvan template validate react-component.njk
```

## Best Practices

### 1. Use Template Inheritance

```javascript
// Base template with common structure
{% extends "base.njk" %}

// Override specific blocks
{% block content %}
// Custom content
{% endblock %}
```

### 2. Create Reusable Macros

```javascript
{% macro card(title, content) %}
<div class="card">
  <h3>{{ title }}</h3>
  <p>{{ content }}</p>
</div>
{% endmacro %}
```

### 3. Add Custom Filters

```javascript
template.addFilter('pluralize', (str, count) => {
  return count === 1 ? str : str + 's';
});

// {{ "item" | pluralize(items.length) }}
```

### 4. Use Conditional Logic

```javascript
{% if typescript %}
// TypeScript-specific code
{% else %}
// JavaScript code
{% endif %}
```

### 5. Organize Templates

```
.gitvan/templates/
├── base/           # Base templates
├── components/     # Component templates
├── api/            # API templates
├── tests/          # Test templates
└── macros.njk      # Reusable macros
```

## Next Steps

- [Example 4: Job Scheduling](./04-job-scheduling.md)
- [Example 5: Error Handling](./05-error-handling.md)

---

**Key Takeaways:**

1. Templates use Nunjucks syntax
2. Add custom filters for transformation
3. Use macros for reusability
4. Template inheritance for structure
5. Integrate templates with workflows
