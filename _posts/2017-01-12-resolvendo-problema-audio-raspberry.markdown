---
title:  "Resolvendo problema de áudio no Raspberry Pi 3"
date:   2017-01-12 23:04:00
description: Ubuntu Mate sem áudio no Raspberry
---

Olá caro(a) leitor(a),

adquiri recentemente um Raspberry Pi 3 B para brincar um pouco. Instalei o Ubuntu Mate e tive uma desagradável surpresa: O ÁUDIO NÃO FUNCIONOU. Nem pelo HDMI nem pelo conector padrão. Depois de buscar muito uma solução, acabei caindo em um post do forum do Ubuntu Mate que passa algumas dicas sobre isso, e, assim, resolvi o problema. Seguem os bendito comandos:

Caso queira o áudio pelo HDMI:
{% highlight shell %}
sudo amixer cset numid=3 2
{% endhighlight %}

Caso queira o áudio pela saída padrão:
{% highlight shell %}
sudo amixer cset numid=3 1
{% endhighlight %}


Para ver o post na íntegra, você pode clicar [aqui](https://ubuntu-mate.org/raspberry-pi/).


Até a próxima ;)