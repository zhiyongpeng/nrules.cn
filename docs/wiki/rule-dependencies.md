# 规则依赖

在生产中，规则引擎规则由规则引擎内存中匹配事实的条件，和插入、更新或撤回事实的动作组成。然而，在真正的软件项目中，这还不够。规则还需要能够与应用程序的其余部分进行交互。这可以通过几种方式实现。

由于规则是常规的 .NET 类，因此它们只能访问各种单例和静态服务。这显然不太理想，因为使用单例会导致紧密耦合的设计，并且通常并不鼓励使用单例。

更好的设计是通过 DI 容器解析依赖关系。 此处的一个选项是通过容器解析规则类型，并将依赖项注入其中（请参阅[规则激活](/wiki/fluent-rules-loading.html#规则激活)）。 然而，这带来了一个问题， 规则类在应用程序的生命周期内仅实例化一次，因此只能注入单实例服务。 对于某些应用程序来说，这可能就足够了，但当它不够时，还有另一种选择。

规则可以使用流式 DSL 声明其依赖关系，规则引擎将在运行时动态地解析这些依赖项。 该方法的好处是，每次触发规则时都会解析依赖项，这意味着依赖项的生命周期现由容器管理。

```csharp
public class DeniedClaimNotificationRule : Rule
{
    public override void Define()
    {
        INotificationService service = null;
        Claim claim = null;

        Dependency()
            .Resolve(() => service);

        When()
            .Match(() => claim, c => c.Status == ClaimStatus.Denied);

        Then()
            .Do(_ => service.ClaimDenied(claim));
    }
}
```

当使用规则 DSL 声明依赖项时，依赖项以与事实变量绑定相同的方式绑定到变量。 然后，服务变量可用于规则执行。 规则引擎将在规则触发时注入依赖项。

>**注意** 规则依赖项不能在规则条件中使用。

为了能够使用规则依赖项，必须实现`IDependencyResolver`接口，并在`ISession`或`ISessionFactory`级别设置解析器实例。

NRules 在单独的集成程序集（请参阅 [NRules.Integration.Autofac](https://www.nuget.org/packages/NRules.Integration.Autofac)）中，附带了`IDependencyResolver`以及用于 Autofac IoC 容器的`IRuleActivator`的实现。 使用集成包，以下将完全引导并使用 Autofac 容器注册 NRules。 注册扩展返回注册生成器，允许自定义单个注册。

```csharp
var types = builder.RegisterRules(x => x.AssemblyOf(typeof(MyRule)));
builder.RegisterRepository(r => r.Load(x => x.From(types)));
builder.RegisterSessionFactory();
builder.RegisterSession();
```