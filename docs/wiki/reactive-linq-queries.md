# 响应式 LINQ 查询

规则通常是为了匹配规则引擎的工作内存中的个别事实而编写的，这对于大多数推理场景是足够的。 但是，有时需要匹配一组事实。 这就是 NRules 中的响响应式 LINQ 查询发挥作用的地方。

查询首先匹配满足特定条件集的所有事实，但响应式查询允许使用 LINQ 样式查询运算符进一步聚合匹配事实，而不是为每个匹配触发规则。 例如，可以通过一组属性对匹配事实进行分组，并可以为每个匹配组触发规则。

这些查询称为响应式查询，因为即使它们看起来正在查询规则引擎的内存，也会在规则引擎中插入、更新或撤消事实时以增量方式计算它们。 因此，响应式查询与匹配单个事实一样有效。

查询结果必须绑定到变量，以便可以在其它规则模式或规则执行中使用。

响应式 LINQ 查询支持以下运算符。
* Match - 通过匹配规则引擎内存中的事实来启动查询
* Where - 按一组条件过滤源元素
* GroupBy - 将源元素聚合到组中
* Collect - 将源元素聚合到集合中
* Select - 呈现源集合
* SelectMany - 展开源集合
  
```csharp
[Name("Preferred customer discount")]
public class PreferredCustomerDiscountRule : Rule
{
    public override void Define()
    {
        Customer customer = null;
        IEnumerable<Order> orders = null;

        When()
            .Match<Customer>(() => customer, c => c.IsPreferred)
            .Query(() => orders, x => x
                .Match<Order>(
                    o => o.Customer == customer,
                    o => o.IsOpen,
                    o => !o.IsDiscounted)
                .Collect()
                .Where(c => c.Any()));

        Then()
            .Do(ctx => ApplyDiscount(orders, 10.0)));
    }
}
```

在存在相应运算符的情况下，也可以使用标准 LINQ 查询语法，而不是使用扩展方法语法。

```csharp
[Name("Orders by customer")]
public class OrdersByCustomerRule : Rule
{
    public override void Define()
    {
        IGrouping<Customer, Order> group = null;

        When()
            .Query(() => group, q => 
                from o in q.Match<Order>()
                where o.IsOpen
                group o by o.Customer into g 
                select g);

        Then()
            .Do(ctx => Console.WriteLine("Customer {0} has {1} open order(s)", 
                group.Key.Name, group.Count()));
    }
}
```