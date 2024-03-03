# Ivy Compatibility Check

Welcome to Ivy Compatibility Check, a tool designed to help you ensure that your Angular applications are using only Ivy-compatible libraries. This library currently supports Angular 15, and we're working on adding support for older versions as well.

## Prerequisites

- Make sure your project is using Angular v15
- Make sure you have successfully installed node_modules without any errors
- Make sure to run `ng serve` command

## Installation

To install Ivy Compatibility Check, simply run:

```bash
npm install ivycc --save-dev
```

## Usage

After installation, you can use Ivy Compatibility Check in your Angular project by running the following command:

For angular applications -

```bash
npx ng g ivycc:check
```

For nx workspace based angular applications -

```bash
npx nx g ivycc:check
```

This command will analyze your project's dependencies and provide a report on any libraries that are not compatible with Ivy. It's a simple yet powerful way to ensure that your application remains compatible with the latest Angular advancements.

Thank you for choosing Ivy Compatibility Check! If you encounter any issues or have suggestions for improvement, please don't hesitate to reach out to us. We're here to help you build better Angular applications.