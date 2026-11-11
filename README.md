# Claude Videos Collection

App de macOS para navegar, pré-visualizar e retomar o trabalho nos vídeos e composições HTML feitos com o Claude Code. O visual é inspirado em ferramentas de revisão de vídeo: grade de miniaturas, player com timecode e um painel lateral com o histórico das conversas.

> Projeto pessoal, não oficial. Não é afiliado à Anthropic nem endossado por ela.

## O que faz

- **Biblioteca**: lê as pastas que você indicar e mostra vídeos, HTML, áudio e imagens, por pasta ou tudo junto, com busca, filtros e ordenação. O app só lê; não altera nenhum arquivo.
- **Miniaturas**: passar o mouse sobre um vídeo percorre o conteúdo.
- **Player**: timecode com frames, avanço quadro a quadro (setas), loop, velocidade e tela cheia.
- **Conversas**: para cada arquivo, lista as conversas do Claude Code que mexeram naquela pasta e mostra o histórico.
- **Retomar**: escreva o que quer mudar e o app abre o Claude Code no Terminal, continuando a conversa escolhida ou começando uma nova.

## Requisitos

- macOS em Mac com Apple Silicon (M1 ou mais novo)
- [ffmpeg](https://ffmpeg.org) para miniaturas e dados técnicos: `brew install ffmpeg`
- [Claude Code](https://claude.com/claude-code) instalado, para o histórico e para retomar conversas

Sem o ffmpeg o app abre, mas os vídeos ficam sem miniatura. Sem o Claude Code, a parte de conversas fica vazia.

## Instalar

1. Baixe o `Claude-Videos-Collection.dmg` na página de [Releases](../../releases).
2. Abra o `.dmg` e arraste o app para a pasta Aplicativos.
3. Na primeira vez o macOS avisa que o app não foi verificado, porque ele não é assinado pela Apple. Vá em **Ajustes do Sistema → Privacidade e Segurança** e clique em **Abrir Mesmo Assim**.
4. No app, clique em **Adicionar pasta** e escolha onde ficam seus vídeos.

## Atalhos do player

| Tecla | Ação |
| --- | --- |
| Espaço ou K | Reproduzir / pausar |
| ← → | Um quadro para trás / para frente |
| Shift + ← → | Um segundo |
| J / L | 5 segundos para trás / para frente |
| M | Mudo |
| F | Tela cheia |
| ⌘← / ⌘→ | Arquivo anterior / próximo |
| Esc | Fechar o visualizador |

## Desenvolvimento

```bash
npm install
npm start
```

Para empacotar o `.app` e o `.dmg` em `dist/`:

```bash
npm run build
```

Para empacotar e já copiar para `/Applications`:

```bash
npm run build -- install
```

## Como funciona

- `main.js`: janela, menus, miniaturas de HTML e abertura do Claude Code no Terminal.
- `lib/scan.js`: varre as pastas da biblioteca.
- `lib/media.js`: miniaturas, dados técnicos e cópias de preview via ffmpeg.
- `lib/sessions.js`: lê o histórico em `~/.claude/projects` e liga cada conversa às pastas e arquivos.
- `renderer/`: a interface.

As preferências, as miniaturas e o índice das conversas ficam em `~/Library/Application Support/Claude Videos Collection`. Nada é enviado para fora do computador.
