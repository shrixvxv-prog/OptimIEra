import type { Config } from '@docusaurus/types';
const config: Config = {
  title: 'OptimIEra Atlas',
  tagline: 'Verifiable Prompt Intelligence',
  url: 'https://docs.optimiera.dev',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.svg',
  organizationName: 'optimiera',
  projectName: 'optimiera',
  presets: [
    [
      'classic',
      {
        docs: { sidebarPath: './sidebars.ts', showLastUpdateTime: false },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      logo: { alt: 'OptimIEra Atlas', src: 'img/favicon.svg' },
      items: [
        { to: '/docs/start-here/what-is-optimiera', label: 'Start Here', position: 'left' },
        {
          to: '/docs/0g-architecture/why-optimiera-uses-0g',
          label: '0G Architecture',
          position: 'left',
        },
        { to: '/docs/developers/windows-setup', label: 'Developers', position: 'left' },
      ],
    },
    footer: { style: 'dark', links: [] },
  },
};
export default config;
