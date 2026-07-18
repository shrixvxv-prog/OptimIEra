import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
const sidebars: SidebarsConfig = {
  atlas: [
    {
      type: 'category',
      label: 'Start Here',
      items: [
        'start-here/what-is-optimiera',
        'start-here/how-optimiera-works',
        'start-here/product-status',
      ],
    },
    {
      type: 'category',
      label: 'Product',
      items: [
        'product/prompt-analyzer',
        'product/evaluation-lab',
        'product/prompt-registry',
        'product/api-sdk-cli',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: ['concepts/prompt-asset', 'concepts/evidence-manifest', 'concepts/certificate'],
    },
    {
      type: 'category',
      label: 'User Guides',
      items: [
        'guides/optimize-first-prompt',
        'guides/verify-certificate',
        'guides/protect-private-prompt',
      ],
    },
    {
      type: 'category',
      label: '0G Architecture',
      items: [
        '0g-architecture/why-optimiera-uses-0g',
        '0g-architecture/compute',
        '0g-architecture/storage',
        '0g-architecture/chain',
        '0g-architecture/agentic-id',
        '0g-architecture/da',
        '0g-architecture/payment',
        '0g-architecture/data-flow',
      ],
    },
    {
      type: 'category',
      label: 'Developers',
      items: [
        'developers/windows-setup',
        'developers/local-development',
        'developers/environment-variables',
        'developers/integration-status',
      ],
    },
    {
      type: 'category',
      label: 'Trust Center',
      items: [
        'trust/security-model',
        'trust/privacy-model',
        'trust/threat-model',
        'trust/known-limitations',
      ],
    },
    {
      type: 'category',
      label: 'Proof Center',
      items: ['proof-center/current-status', 'proof-center/official-resources'],
    },
    {
      type: 'category',
      label: 'Build Journey',
      items: [
        'journey/program-overview',
        'journey/wave-1',
        'journey/wave-2',
        'journey/wave-3',
        'journey/wave-4',
        'journey/wave-5',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['reference/glossary', 'reference/environment-variables'],
    },
  ],
};
export default sidebars;
