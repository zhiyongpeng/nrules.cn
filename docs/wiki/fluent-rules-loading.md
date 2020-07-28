# 流式规则加载

NRules fluent API 不仅提供了一种使用内部 DSL 定义规则的机制，而且还发现，实例化这些规则并将其加载到规则存储库中，以便将其编译为可执行的形式。

有关流式规则 DSL 的概述，请参阅 [流式规则 DSL](/wiki/fluent-rules-dsl.html)。

## 使用流式规范加载规则

使用流式规则 DSL，每个规则都是一个类，且`RuleRepository`提供了一种机制，可以使用流式的负载规范在运行时发现和加载规则类。方法`Load`接受一个执行委托，该委托指示存储库要扫描哪些程序集且/或类型来加载规则。它还使用与规则类关联的元数据提供高级过滤功能。

例如，从执行程序集加载所有规则，其中规则的名称以“Test”开头，或者规则标记为“Test”标记。 将这些规则加载到名为“MyRuleSet”的规则集中。

```csharp
var repository = new RuleRepository();
repository.Load(x => x
    .From(Assembly.GetExecutingAssembly())
    .Where(rule => rule.Name.StartsWith("Test") || rule.IsTagged("Test"))
    .To("MyRuleSet"));
```

如果具有给定名称的规则集已经存在，那么`Load`方法只是向其添加规则。

加载规则后，可以将整个存储库或仅一部分规则集编译为可执行的形式。

```csharp
var ruleSets = repository.GetRuleSets();
var compiler = new RuleCompiler();
ISessionFactory factory = compiler.Compile(ruleSets.Where(x => x.Name == "MyRuleSet"));
```

## 规则激活

作为将规则从流式 DSL 形式转换为规范模型的一部分，必须实例化规则类。 默认情况下，NRules 使用 `System.Activator` 实例化规则类。 可能需要控制实例化过程，以便例如，可以通过 IoC 容器实例化规则并注入依赖关系。

每当`RuleRepository`需要实例化规则时，它就会调用一个规则激活器，由`IRuleActivator`接口表示，并通过`RuleRepository.RuleActivator`属性公开。 要提供自定义规则激活器，请实现`IRuleActivator`接口并将其设置在存储库中。

例如，可以通过 Autofac IoC 容器注册和解析规则。

```csharp
public class AutofacRuleActivator : IRuleActivator
{
    private readonly ILifetimeScope _scope;
    
    public AutofacRuleActivator(ILifetimeScope scope)
    {
        _scope = scope;
    }
    
    public IEnumerable<Rule> Activate(Type type)
    {
        yield return (Rule)_scope.Resolve(type);
    }
}

// 生成容器
var builder = new ContainerBuilder();
builder.RegisterAssemblyTypes(Assembly.GetExecutingAssembly())
    .Where(t => t.IsAssignableTo<Rule>())
    .AsSelf();
var container = builder.Build();

// 加载规则
var ruleRepository = new RuleRepository();
ruleRepository.Activator = new AutofacRuleActivator(container);
ruleRepository.Load(r => r.From(Assembly.GetExecutingAssembly()));

// 编译规则
var factory = ruleRepository.Compile();
```