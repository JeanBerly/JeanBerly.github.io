---
title: Complexidade assintótica sem o teatro do Big-O
date: 2026-07-02
tags: [computacao, opiniao]
---

Big-O não é um selo de qualidade e não é desculpa para escrever código lento “porque é O(n)”. Ele responde uma pergunta estreita: *como o custo cresce quando a entrada cresce*, ignorando constantes e a máquina de verdade.

$O(n^2)$ no papel pode ganhar de $O(n \log n)$ no seu dataset. As constantes existem. O cache existe. Meça.
