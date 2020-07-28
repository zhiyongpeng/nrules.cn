'use strict';
const path = require('path')

module.exports = {
    doc: {
        name: "NRules 中文",
        description: "NRules 是 .NET 的开源生产规则引擎，基于 Rete 匹配算法",
        version: "1.0.0",
        dir: "",
        outDir: "",
        staticDir: ""
    }, 
    theme: {
        dir: "", 
        title: "NRules 中文",
        headHtml:  `
        <meta name="description" content="NRules 是 .NET 的开源生产规则引擎，基于 Rete 匹配算法" />
        <meta name="keywords" content=".NET, 规则引擎, NRules" />
        `,
        footHtml: `
        <script>
        (function() {
            var ipc = window.document.createElement("div");
            ipc.id = "ipcBox";
            ipc.style.fontSize = "12px";
            ipc.style.maxWidth = "900px";
            ipc.style.padding = "20px";  
            ipc.style.boxSizing = "border-box";
            ipc.style.margin = "0px";
            ipc.style.textAlign = "center";
            ipc.style.backgroundColor = "#fff";
            ipc.innerHTML = "<span style='color: #bdbdbd;'>&copy;2020 nrules.cn </span><a style='color: #bdbdbd;' href='http://www.beian.miit.gov.cn/' target='_blank'> 粤ICP备19080595号-4	</a>"
            document.querySelector(".tea-container").appendChild(ipc);
        })();
        </script>
        `,
        isMinify: true,
        rootPath: "/"
    },
    nav: {
        tree: "./tree"
    }
}