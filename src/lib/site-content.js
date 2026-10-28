export const site = {
  name: 'ONEORIGIN',
  url: 'https://os.1origin.dev',
  title: 'ONEORIGIN — Developer workspace and AI agent interface',
  description: 'ONEORIGIN is a developer workspace with an AI agent interface, customizable templates, and an operator-only AWS hosting integration for GitHub builds, preview URLs, and logs.',
};

export const applicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${site.url}/#application`,
  name: site.name,
  url: `${site.url}/`,
  description: site.description,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web browser',
};

export const homepageMarkdown = `# ONEORIGIN — Developer workspace and AI agent interface

${site.description}

## Build beyond boundaries

The origin of your next extraordinary idea. Create with thoughtfully crafted components, consistent design tokens, and customizable landing page, dashboard, and portfolio templates. Explore the public product pages in your browser without signing in.

## Agent interface

The [Agent page](${site.url}/Agent) demonstrates browser and terminal conversation surfaces with text, image, audio, and video controls. The current conversation is a scripted demonstration, not a connected AI model or a working command-line runtime. Personality controls demonstrate the interface.

## Hosting

The [Hosting page](${site.url}/hosting) contains the integration for the existing AWS deployment system: GitHub source, builds, public preview URLs, deployment history, and logs. AWS operator sign-in is separate from the workspace account. Availability depends on the site's AWS callback and origin configuration. The current build worker supports the connected 1origin Nuxt project, not arbitrary repositories or this TanStack application.

## Templates and early access

Explore landing page, dashboard, and portfolio starting points on the homepage. The early-access form currently demonstrates a local confirmation; it does not subscribe visitors to a mailing list. Public pricing and self-service hosting plans have not been established.

## Learn more

- [About ONEORIGIN](${site.url}/about)
- [Agent information index](${site.url}/llms.txt)
- [Public sitemap](${site.url}/sitemap.xml)
`;

export const llmsText = `# ONEORIGIN

> ONEORIGIN is a developer workspace with an AI agent interface, templates, and an operator-only AWS hosting integration.

The Agent conversation is a scripted demo. Hosting requires separate AWS operator access and deployment setup. No public pricing or self-service hosting is promised. This file describes public content; it grants no API access or authorization.

## Product information

- [Product overview](${site.url}/index.md): Features, current limitations, and links to public pages.

## Optional

- [Public sitemap](${site.url}/sitemap.xml): Index of public product pages.
`;
