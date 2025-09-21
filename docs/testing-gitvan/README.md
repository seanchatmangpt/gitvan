# Testing GitVan - mdbook

This directory contains a comprehensive mdbook on testing GitVan applications using `citty-test-utils`.

## Building the Book

### Prerequisites

Install mdbook:

```bash
# Install mdbook
cargo install mdbook

# Or using npm
npm install -g mdbook
```

### Build Commands

```bash
# Build the book
mdbook build

# Serve the book locally
mdbook serve

# Watch for changes and rebuild
mdbook watch
```

### Output

The built book will be available in the `book/` directory and can be served locally at `http://localhost:3000` when using `mdbook serve`.

## Book Structure

- **Introduction** - Overview and getting started
- **Getting Started** - Installation and first tests
- **Core Testing Concepts** - Fundamental testing principles
- **Local Testing** - Testing in development environment
- **Cleanroom Testing** - Isolated Docker testing
- **Scenario Testing** - Multi-step workflow testing
- **Advanced Patterns** - Enterprise testing strategies
- **CI/CD Integration** - Automated testing pipelines
- **Troubleshooting** - Common issues and solutions
- **Best Practices** - Recommended patterns and guidelines
- **Examples** - Comprehensive real-world examples

## Features

- **Comprehensive Coverage** - All aspects of testing GitVan applications
- **Real-world Examples** - Practical, copy-paste examples
- **Progressive Learning** - From basic to advanced concepts
- **Cross-references** - Links between related topics
- **Search Functionality** - Full-text search across all content
- **Responsive Design** - Works on desktop and mobile
- **Dark/Light Themes** - User preference support

## Contributing

To contribute to this book:

1. Edit the markdown files in this directory
2. Test changes locally with `mdbook serve`
3. Submit a pull request with your changes

## License

This book is part of the GitVan project and follows the same MIT license.
