export default {
  logo: <span style={{ fontWeight: 'bold' }}>Information Foraging Theory</span>,
  project: {
    link: 'https://github.com/ianpilon/Create-Modern-Documentation-Sites'
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Information Foraging Theory'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="description" content="A wiki on Peter Pirolli's information foraging theory and the broader research program on computational models of human-information interaction." />
    </>
  ),
  navigation: {
    prev: true,
    next: true
  },
  footer: {
    text: 'Information Foraging Theory wiki ' + new Date().getFullYear()
  },
  sidebar: {
    defaultMenuCollapseLevel: 2,
    toggleButton: true
  },
  toc: {
    float: true,
    title: 'On This Page'
  }
}
