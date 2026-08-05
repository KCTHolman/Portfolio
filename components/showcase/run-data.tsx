import type { ReactNode } from 'react'

/* ==========================================================================
   Eén run door de pijplijn, stap voor stap.

   Dit stond eerder als data-attributen in de HTML, waar widget.js het weer
   uit terugleesde. Nu is het gewoon de bron: de rail-ticks, de teller, de
   "jouw kant"-lijst en het logboek zelf komen alle vier hieruit.
   ========================================================================== */

export type RunStep = {
  /** Volgnummer zoals het in het logboek staat. */
  t: string
  /** Wie er aan zet is: jij, poort, agent, checks of levering. */
  who: string
  /** Alleen bij menselijke stappen — wat voor handeling het is. */
  kind?: string
  /** Een poort houdt de run stil tot de bezoeker goedkeurt. */
  gate?: boolean
  /** Hoe lang deze stap het scherm vasthoudt, in ms. Een dichte stap mag
   *  langer blijven staan dan een korte. */
  dwell: number
  /** Positie op de rail, in procenten. */
  p: number
  title: string
  detail: ReactNode
  tech?: ReactNode
  fail?: ReactNode
  /** Stap 07 draagt de fasenlijst van de epic. */
  extra?: ReactNode
}

const PHASES = [
  {
    n: 'Fase 1',
    t: 'Klein en groot als vaste keuze',
    b: 'Koffie komt als product in het dagboek, met twee opgeslagen porties: klein van 150 ml en groot van 250 ml. Die staan bovenaan bij je favorieten. Er komt geen nieuw scherm bij.',
    d: 'Af als je met één tik een koffie logt en hij in je dagoverzicht staat.',
  },
  {
    n: 'Fase 2',
    t: 'Spraak die doorvraagt',
    b: 'Spreek je “twee koffie” in, dan vraagt de app “klein of groot?” en slaat pas na je antwoord op. De doorvraag zelf bestaat al; koffie wordt eraan toegevoegd.',
    d: 'Af als je zonder te typen twee kleine koffie kunt loggen.',
  },
  {
    n: 'Fase 3',
    t: 'Terugkijken, en verder dan koffie',
    b: 'Een dagtotaal in koppen én milliliters, plus een cafeïneveld op producten zodat thee, cola en energiedrank meetellen. Dit is de enige fase die aan het datamodel komt.',
    d: 'Af als je van een dag ziet hoeveel cafeïne erin ging, ook als het geen koffie was.',
  },
]

export const RUN_STEPS: RunStep[] = [
  {
    t: '01',
    who: 'jij',
    kind: 'invoer',
    dwell: 4000,
    p: 0,
    title: 'Idee in de inbox',
    detail:
      'Eén zin, zoals ik hem bedenk. Geen lijstje eisen, geen plek uitgekozen — alles gaat naar dezelfde inbox.',
    tech: (
      <>
        Het issue komt binnen in de fleet-repo en raakt daar niets aan: <code>intake.yml</code> is
        workflow_call-only, net als alle zestien workflows. Een guard-script bewijst dat bij elke PR,
        zodat een reusable workflow nooit vanzelf kan starten.
      </>
    ),
    fail: (
      <>
        Valt de poort uit, dan verdwijnen ideeën stil. Daarom staat <code>intake.yml</code> in de
        spine-lijst: uitval daarvan wordt actief gemeld in plaats van afgewacht.
      </>
    ),
  },
  {
    t: '02',
    who: 'poort',
    dwell: 4000,
    p: 9,
    title: 'Naar het juiste project',
    detail:
      'Het woord “app” is genoeg om het naar BiohackOS te sturen. Weet de poort het niet zeker, dan kiest hij niet maar vraagt hij het.',
    tech: (
      <>
        <code>intake-decide.sh</code> telt hele woorden uit <code>routing.yml</code> per consument.
        Strikt de meeste punten wint; de winnaar krijgt het issue via een transfer, niet via een
        kopie.
      </>
    ),
    fail: (
      <>
        Gelijkspel of nul punten → label <code>needs-routing</code> en het issue blijft staan met een
        vraag. Die grensgevallen liggen vast in de golden-set:{' '}
        <code>08-grensgeval-domein-wint</code>, <code>09-grensgeval-infra-wint</code>,{' '}
        <code>10-gelijkspel-blijft-routing</code>.
      </>
    ),
  },
  {
    t: '03',
    who: 'agent',
    dwell: 4500,
    p: 18,
    title: 'Triage',
    detail:
      'Wat voor werk is dit, en welk deel van de app raakt het? Het voedingsdagboek, waar eten en drinken al in gaan.',
    tech: (
      <>
        <code>issue-triage.yml</code> draait op lane <code>biohack-agent</code> met een turn-budget
        van 30. Labels komen uit <code>.fleet.yml</code>: <code>claude-task</code> plus de area die
        volgt uit de padentabel — <code>^(lib|android|test)/</code> en <code>.dart</code> geven{' '}
        <code>area: app</code>.
      </>
    ),
    fail: (
      <>
        Te vaag om te routeren? Dan stuitert het terug met één concrete wedervraag in plaats van een
        gok. Ook dat staat in de golden-set: <code>03-te-vaag</code>, <code>04-geen-criteria</code>,{' '}
        <code>05-ambigu</code>.
      </>
    ),
  },
  {
    t: '04',
    who: 'agent',
    dwell: 5500,
    p: 28,
    title: 'Plan langs het kompas',
    detail:
      'Eerst kijkt de agent waar het project naartoe wil. Bovenaan staat “loggen moet minder moeite kosten”, met een regel eronder: vaste keuzes en één tik gaan vóór handmatig typen. Dit idee past er precies in — het moet alleen op die manier gebouwd worden.',
    tech: (
      <>
        De agent leest de bronhiërarchie voor hij plant: <code>constitution.md</code> &gt;{' '}
        <code>doelen.md</code> &gt; <code>spec.md</code> &gt; <code>AGENTS.md</code>.{' '}
        <code>constitution.md</code> is een harde grens, <code>doelen.md</code> stuurt binnen die
        grens.
      </>
    ),
    fail: (
      <>
        Botst een plan met <code>constitution.md</code>, dan is er geen afweging: het gaat niet door.
        Bij <code>doelen.md</code> wel — die stuurt bij, en dat is precies wat hier gebeurt.
      </>
    ),
  },
  {
    t: '05',
    who: 'agent',
    dwell: 6000,
    p: 38,
    title: 'Een kop is geen maat',
    detail:
      'Hier begint het meedenken. De app rekent in milliliters: een espresso van 40 ml en een mok van 250 ml zijn allebei “een koffie”, dus zonder formaat is het dagtotaal een getal waar je niets aan hebt. En thee, cola en energiedrank stellen exact dezelfde vraag. Dus geen koffiescherm, maar één manier om drankjes te loggen — met klein en groot als vaste keuzes.',
    tech: (
      <>
        Het datamodel bepaalt de vorm, niet de wens: <code>FoodUnit</code> kent gram, milliliter en
        stuk, en macro&apos;s staan per 100 daarvan. “Een kop” bestaat niet als eenheid, dus een
        formaat is geen extraatje maar een voorwaarde.
      </>
    ),
    fail: 'Zou je het toch als los aantal opslaan, dan drift dat weg van de rest van het dagboek — twee bronnen voor hetzelfde getal. Dat patroon is precies wat de consistency-checks moeten vangen.',
  },
  {
    t: '06',
    who: 'agent',
    dwell: 6000,
    p: 48,
    title: 'Aanhaken op wat er al is',
    detail:
      'Het dagboek kent al favorieten, opgeslagen porties en een spraakknop die doorvraagt als iets onduidelijk is. Zeg je “twee koffie”, dan is “klein of groot?” precies de vraag die dat mechanisme al kan stellen. Er hoeft dus weinig bij: het bestaande moet alleen weten wat een kop koffie is.',
    tech: (
      <>
        De doorvraag bestaat al in de code: <code>FoodCapture</code> heeft een{' '}
        <code>followupQuestion</code>, en de invoerwegen (barcode, foto, spraak/chat, handmatig)
        delen dezelfde domeinlaag zonder Flutter-afhankelijkheden.
      </>
    ),
    fail: 'Zou spraak een eigen opslagpad krijgen, dan heb je twee wegen naar hetzelfde dagboek. Eén bron van waarheid is een invariant, geen voorkeur.',
  },
  {
    t: '07',
    who: 'agent',
    dwell: 9000,
    p: 58,
    title: 'Het wordt een epic',
    detail:
      'Te groot voor één keer, en de stukken zijn los al bruikbaar. Elke fase krijgt er meteen bij wanneer hij af is — anders kan niemand achteraf vaststellen of het gelukt is.',
    extra: (
      <ol className="dsv-phases">
        {PHASES.map((phase) => (
          <li key={phase.n} className="dsv-phase">
            <span className="dsv-phase-n">{phase.n}</span>
            <span className="dsv-phase-t">{phase.t}</span>
            <span className="dsv-phase-b">{phase.b}</span>
            <span className="dsv-phase-d">{phase.d}</span>
          </li>
        ))}
      </ol>
    ),
    tech: (
      <>
        <code>epic-orchestrator.yml</code> houdt de reeks vast: fase-issues met een vaste volgorde,
        en alleen de eerste staat open. <code>plan-critic.sh</code> heeft het plan al mechanisch
        getoetst op concrete stappen en op een genoemde verificatie.
      </>
    ),
    fail: 'Verwerpt de criticus het plan, dan wordt er niets gebouwd — een fout plan is het duurste faalpad, want je betaalt build, review en herstel op het verkeerde fundament. Twijfelgevallen komen er als bevinding uit, niet als afwijzing.',
  },
  {
    t: '08',
    who: 'agent',
    dwell: 4500,
    p: 68,
    title: 'Build',
    detail:
      'Alleen fase 1 gaat open. Een agent bouwt het, op een eigen machine en met een limiet — loopt hij vast, dan stopt hij vanzelf.',
    tech: (
      <>
        De build draait op de self-hosted lane <code>biohack-agent</code> in een ephemeral container
        zonder docker-daemon, met een turn-budget van 80 en <code>claude-sonnet-5</code> als model;
        escalatie gaat naar <code>claude-opus-5</code>. Concurrency-groepen staan op het issue.
      </>
    ),
    fail: (
      <>
        Runner offline? De lane valt terug op <code>ubuntu-latest</code>, en{' '}
        <code>runner-fleet-assert.yml</code> meldt het. Turn-budget op? De agent stopt en escaleert
        naar <code>needs-human</code> in plaats van door te blijven draaien.
      </>
    ),
  },
  {
    t: '09',
    who: 'checks',
    dwell: 5500,
    p: 77,
    title: 'Werkt de rest nog?',
    detail:
      'Dit zit aan de rekenkern van het dagboek, dus draaien de tests over alles wat je logt en niet alleen over koffie. Een tweede agent leest het werk na; die review is advies, alleen de tests kunnen tegenhouden.',
    tech: (
      <>
        <code>pr-check.yml</code> draait zes jobs met concurrency op het PR-nummer:
        diff-classificatie, conventional-commit-titel, <code>flutter analyze</code> en{' '}
        <code>flutter test</code> (beide blokkerend), coverage (rapporteert), preview-APK, en eslint
        op de webkant. <code>doctor.yml</code> en <code>gitflow-doctor.yml</code> bewaken de
        invarianten; de doctor rapporteert hard en muteert nooit.
      </>
    ),
    fail: (
      <>
        Rood? De PR blokkeert, de pijplijn repareert zichzelf en draait opnieuw; blijft het rood, dan
        escaleert het. Loopt <code>cockpit/project-digest.md</code> uit de pas met de registry, dan
        blokkeert de digest-guard — die plattegrond werd handmatig bijgehouden tot hij drift ging
        vertonen, en is nu gegenereerd en CI-bewaakt.
      </>
    ),
  },
  {
    t: '10',
    who: 'jij',
    kind: 'merge',
    gate: true,
    dwell: 4500,
    p: 86,
    title: 'Merge',
    detail:
      'Hier wacht het op mij, één keer per fase. Kleine dingen gaan vanzelf door; zeg ik ja, dan begint de volgende fase.',
    tech: (
      <>
        <code>auto-merge.yml</code> kijkt naar <code>gates.feature_approval</code> in{' '}
        <code>.fleet.yml</code>: op <code>true</code> wacht een feature op approval, de rest mergt
        door op groen. <code>branch-protection-assert.yml</code> controleert dat de beveiliging op de
        branch ook echt aanstaat.
      </>
    ),
    fail: (
      <>
        Ontstaat er een merge-conflict, dan lost de pijplijn dat zelf op en draait opnieuw. Lukt dat
        niet, dan is <code>needs-human</code> de derde en laatste poort.
      </>
    ),
  },
  {
    t: '11',
    who: 'jij',
    kind: 'release',
    gate: true,
    dwell: 4500,
    p: 94,
    title: 'Release',
    detail:
      'Pas als alle drie de fases binnen zijn, gaat het als geheel naar buiten. Ook daar zet ik zelf de knop om.',
    tech: (
      <>
        <code>issue-release.yml</code> en <code>promote-release.yml</code> leveren pas als alle
        fase-issues gesloten zijn. <code>release_environment: production</code> betekent een
        GitHub-omgeving met required reviewer, dus de knop zit in het platform en niet in een script.
      </>
    ),
    fail: 'Faalt een release halverwege, dan blijft de epic open en gaat er niets half naar buiten. Eén release voor het geheel, of geen.',
  },
  {
    t: '12',
    who: 'levering',
    dwell: 4000,
    p: 100,
    title: 'Live',
    detail:
      'Eén tik voor een grote koffie, “twee kleine” tegen je telefoon kunnen zeggen, en ’s avonds zien hoeveel het er waren.',
  },
]

export const RUN_TOTAL = RUN_STEPS.length
