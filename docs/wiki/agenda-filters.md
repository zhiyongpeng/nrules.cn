# 议程过滤器（Agenda Filters）

当一系列事实满足所有规则的条件时，规则就说是由这些事实激活的。 规则可以通过一组新的匹配事实或更新的现有匹配事实来激活。激活规则时，激活（规则加上匹配的事实集）将被放在议程（Agenda）中。 计算完所有激活后，将选择具有最高优先级的激活，触发规则，并执行其所有动作。

议程过滤器允许在一组条件列入议程之前，将这些条件应用于激活。如果激活通过所有过滤器，则将其放置在议程中，否则不会。议程过滤器可以是动态启用/禁用规则、过滤事实更新（以在已更改值的子集上激活）等的好地方。有两种议程过滤器 - 全局和特定于规则。 全局议程过滤器适用于所有激活，而特定于规则的过滤器仅适用于特定规则的激活。 议程过滤器仅适用于即将被列入议程的激活，因此过滤器永远不会删除已列入议程的激活。

议程过滤器是一个实现`IAgendaFilter`接口的类；其`Accept`方法确定是否要将激活添加到议程中。使用`AddFilter`方法将议程过滤器添加到`ISession.Agenda`。 根据所用方法的特定重载，将过滤器添加为全局过滤器或特定于规则的过滤器。

```csharp
public class DisabledRuleFilter : IAgendaFilter
{
    public bool Accept(Activation activation)
    {
        if (activation.Rule.Tags.Contains("Disabled")) return false;
        return true;
    }
}

//...

var filter = new DisabledRuleFilter();
var session = factory.CreateSession(x =>
    x.Agenda.AddFilter(filter));
```

## 流式规则过滤器

特定于规则的议程过滤器也可以使用流式 DSL 以声明方式添加。 有两种过滤器可以使用流式 DSL 来定义 - 谓词过滤器，根据一组条件测试规则激活，和更改过滤器，该过滤器仅接受特定键组更改的激活。 更改过滤器，尤其对规则链接和递归控制非常有用。一个规则可以更改事实中的一个字段，而另一个规则可以在同一事实中更改不同字段。如果没有更改过滤器，每个规则将链接另一个规则，从而导致无限递归。 使用更改过滤器，两个规则都只能接受他们关心的事实更改，从而改善规则的可组合性并消除不必要的递归。

```csharp
public class OrderAmountCalculationRule : Rule
{
    public override void Define()
    {
        Order order = null;

        When()
            .Match(() => order);

        Filter()
            .OnChange(() => order.Quantity, () => order.UnitPrice, () => order.PercentDiscount);

        Then()
            .Do(ctx => ctx.Update(order, CalculateAmount));
    }

    private static void CalculateAmount(Order order)
    {
        order.Amount = order.UnitPrice * order.Quantity * (1.0 - order.PercentDiscount / 100.0);
    }
}
```