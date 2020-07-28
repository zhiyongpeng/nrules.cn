# 架构

NRules 引擎由多个组件组成，其设计方式是在其之上叠加更多组件和工具，从而增强其功能并扩展其适用范围。

![nrules-components](https://static.nrules.cn/images/NRules-Components.png)

任何规则引擎的核心部分都是规则，它们可以以多种不同的形式存在。 首先，规则以编写它们的形式存在，在 NRules 的情形下，内部 DSL 使用流式 API。 NRules 背后的设计目标之一是支持多种规则语言，因此内部 DSL 被转换为规范形式。 将来，其他语言可以翻译成相同的规范形式。

规范规则模型类似于编译器/ DSL 设计领域中的抽象语法树（AST）。在此形式中，规则表示为可以分析、查看和报告的数据，最重要的是，编译为可执行的形式。

可执行规则模型是一种规则的运行时表示形式，可以有效地与应用程序的其余部分进行交互。 NRules 是一个生产规则引擎，其可执行形式是一个 rete 网络，可以非常有效地将事实与规则相匹配。

![nrules-architecture](https://static.nrules.cn/images/NRules-Architecture.png)

`NRules.Fluent` 命名空间包含使用内部 DSL 以声明性创作规则的类。然后，使用 `RuleRepository` 扫描程序集以发现规则并与 `RuleBuilder` 交互，以将其转换为规范形式。

`NRules.RuleModel`命名空间包含将规则表示为规范模型的类。在此级别，规则是规则集的集合，每个规则集包含规则定义。

`NRules`命名空间包含实现规则引擎的运行时端的类。 `RuleCompiler`将规则从规范形式转换为 rete网络，该网络包含在`SessionFactory`(会话工厂)中。然后，会话工厂用于创建`Session`的实例，其中包含引擎用于推断的事实。 可能存在同一会话工厂创建多个并发会话； 因此，他们将共享同一 rete 网络（这意味着他们将使用同一规则集），但它们将使用不同的事实集合，并且从客户端的角度来看，它们是完全独立的。