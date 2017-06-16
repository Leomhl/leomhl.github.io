---
title:  "Como resolver o erro 'This action could not be completed. Try again. (-22421)'"
date:   2017-06-16 14:10:00
description: Darei uma dica simples para resolver esse erro do hell!
---


Olá developer, se você está passando por esse erro *infernal* que quase fez eu estourar o prazo de entregar um aplicativo... Você está no lugar certo! Esse erro é tão chato que nem o suporte da apple após 1 semana de contato conseguiu me instruir corretamente com o que eu deveria fazer para corrigí-lo. Simplesmente o app não subia do xCode para o iTune Connect de modo algum. SEMPRE dava esse erro independente do que eu fizesse. Então, eis que achei a solução em um post escondido obscuros e mais profundos diretórios do fórum de desenvolvedores da Apple. Caso queira dar uma olhada nessa página, click [aqui](https://forums.developer.apple.com/thread/76803).

Bom, basicamente o que ocorre é que a versão de uma biblioteca de transporte do Application Loader está desatualizada ou corrompida e pelo o que eu entendi até então, o xCode não atualiza essa lib. Os comandos que salvaram o prazo do meu projeto foram os seguintes:

{% highlight SHELL %}
cd ~  
mv .itmstransporter/ .old_itmstransporter/  
"/Applications/Xcode.app/Contents/Applications/Application Loader.app/Contents/itms/bin/iTMSTransporter"
{% endhighlight %}

É só rodar o comando e esperar toda a operação ser realizada. Comigo ela demorou um pouco, mas, no final consegui mandar o app para a loja. Resolvi compartilhar essa dica pois é algo que é necessário ser disseminado pela net, afinal, a Apple não ajuda muito seus desenvolvedores e cobra muito deles... 



Espero que eu tenha conseguido te ajudar! 
May the force be with you!
