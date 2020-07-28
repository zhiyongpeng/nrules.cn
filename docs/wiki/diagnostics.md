# 诊断

NRules 有几个工具来监控执行和排除规则问题。

有一个事件模型，可以在执行周期的各个点挂入引擎。 NRules 不直接与任何 .NET 日志记录框架集成，因此请使用这些事件，来挂接你应用程序正在使用的日志记录框架。

还有 Visual Studio 调试器可视化工具，可以将规则引擎的工作会话作为 Rete 网络的图形表示形式，这可以极大地有助于了解具体场景中，幕后规则引擎中发生的事情。

## 执行事件模型

给定规则会话的规则引擎生命周期事件，可通过`ISession`接口访问的事件提供者公开。 此外，通过`ISessionFactory`接口访问的事件提供者公开所有会话的事件（每个事件的发送方对象引用引发事件的实际会话对象）。

事件提供程序公开以下执行事件，按类别分组：

- 工作内存事件
  - FactInsertingEvent
  - FactInsertedEvent
  - FactUpdatingEvent
  - FactUpdatedEvent
  - FactRetractingEvent
  - FactRetractedEvent
- 议程（Agenda）事件
  - ActivationCreatedEvent
  - ActivationUpdatedEvent
  - ActivationDeletedEvent
  - RuleFiringEvent
  - RuleFiredEvent
- 错误处理事件
  - LhsExpressionFailedEvent
  - AgendaExpressionFailedEvent
  - RhsExpressionFailedEvent
- 表达式跟踪事件
  - LhsExpressionEvaluatedEvent
  - AgendaExpressionEvaluatedEvent
  - RhsExpressionEvaluatedEvent

```csharp
ISession session = factory.CreateSession();
session.Events.FactInsertedEvent += OnFactInsertedEvent;
session.Events.FactUpdatedEvent += OnFactUpdatedEvent;
session.Events.FactRetractedEvent += OnFactRetractedEvent;
session.Events.ActivationCreatedEvent += OnActivationCreatedEvent;
session.Events.ActivationUpdatedEvent += OnActivationUpdatedEvent;
session.Events.ActivationDeletedEvent += OnActivationDeletedEvent;
session.Events.RuleFiringEvent += OnRuleFiringEvent;

//...

private static void OnRuleFiringEvent(object sender, AgendaEventArgs e)
{
    Console.WriteLine("Rule about to fire {0}", e.Rule.Name);
}
```
## 调试器可视化工具

调试器可视化工具是 Visual Studio 的附加组件，可为某些 .NET 类型添加可视化功能。 NRules 附带的调试器可视化工具为`NRules.Session`类型添加了此类可视化功能。 它还需要[DGML](http://en.wikipedia.org/wiki/DGML)可视化功能，在安装 Visual Studio 时必须启用该功能。

NRules 调试器可视化工具未打包，因此您需要从 github 克隆 NRules git 存储库并自行构建。 请确保克隆与您在项目中使用的NRules 库版本完全相同的 repo 版本。 构建完成后，获取`<Repo Root>\binaries\NRules.Debugger.Visualizer\net45`文件夹的内容，并复制到`<Documents>\Visual Studio <Version>\Visualizers`。 如果您在 Visual Studio 2017 下遇到可视化工具问题，请参阅[#162](https://github.com/NRules/NRules/issues/162)。

如果安装正确，则每次调试使用 NRules 的程序时，监视窗口中的`ISession`实例旁边都会出现一个放大镜图标。单击放大镜来打开规则引擎工作会话实例的图形视图。