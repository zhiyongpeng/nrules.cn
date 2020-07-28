# 流式规则 DSL

在 NRules 中定义规则的标准方法，是使用 C# 内部 DSL 流式 API。

规则是一个 .NET 类，继承自`NRules.Fluent.Dsl.Rule`。 然后规则类覆盖定义方法，其中指定了实际条件（左侧或 LHS）和执行（右侧或 RHS）部分。 在`Define`方法中，LHS 通过流式链条件指定到`When()`方法; 和 RHS 通过流式链动作指定到`Then()`方法。

>**注意:**请确保规则类是公开的，否则引擎将无法找到它们。

有关如何加载使用流式规则 DSL 定义的规则，请参阅 [流式规则加载](/wiki/fluent-rules-loading.html)。

规则类还可以选择使用以下自定义属性进行修饰，以将其他元数据与规则相关联。

 **特性**        | **允许多个？**| *继承？*| **说明** 
-------------|-----|-------|:-----
Name  |否  | 否  |指定规则名称
Description |否 |否  |指定规则说明
Tag | 是 | 是 | 将任意标记与规则关联（以后可用于对规则进行分组或过滤）
Priority | 否 | 是 | 设置规则优先级。如果同时激活多个规则，则优先级较高的规则（较大数量）将优先执行。优先权可以是正数或负数。默认值为零。
Repeatability | 否 | 否 | 设置规则的可重复性，即当规则多次使用同一组事实激活时，它如何执行，这对于递归控制很重要。 可重复性可以设置为可重复 - 如果更新了任何匹配的事实，或不可重复，则规则被激活 - 对于给定的匹配事实集，规则仅激活一次（除非匹配被撤回，然后再重新断言）。默认值是可重复的。

```csharp
[Name("MyRule"), Description("Test rule that demonstrates metadata usage")]
[Tag("Test"), Tag("Metadata")]
[Priority(10)]
[Repeatability(RuleRepeatability.Repeatable)]
public class RuleWithMetadata : Rule
{
    public override void Define()
    {
        When()
            .Match<Customer>(c => c.Name == "John Do");
        Then()
            .Do(ctx => DoSomething());
    }
}
```
虽然流畅的规则 DSL 与 C# 一起使用，但规则必须使用声明性方法来定义。在规则定义中的任何位置都不应使用命令式 C# 代码，条件表达式、执行表达式和从这些表达式调用的方法除外。

如果规则模式绑定到变量（请参见下文），则该变量应仅在后续条件和执行表达式中直接使用。 绑定变量的目的是用作指示引擎链接相应条件和执行的标记（具有名称和类型）。不要编写任何执行条件/执行表达式之外绑定变量的代码。

## 将事实与模式匹配

规则的左侧是一组与给定类型的事实匹配的模式。 使用`Match`方法定义模式。 模式可以具有零个、一个或多个条件，这些条件必须全部为真（true），以使模式与给定事实匹配。

模式匹配也是多态的，这意味着它匹配给定类型和任何派生类型的所有事实。 鉴于 Fruit、Apple 和 Pear 的类层次结构，`Match<Fruit>`将匹配 Apple 和 Pears。 因此，`Match<object>`将匹配引擎工作内存中的所有事实。

可选地，模式可以绑定到变量，在这种情况下，该变量可以用于后续模式中以指定事实间条件。此外，变量可用于执行内部更新或撤销相应的事实，或在表达式中使用它。请勿在条件/执行表达式之外的任何位置使用或以其他方式执行绑定变量。

```csharp
public class PreferredCustomerActiveAccountsRule : Rule
{
    public override void Define()
    {
        Customer customer = null;
        Account account = null;

        When()
            .Match<Customer>(() => customer, c => c.IsPreferred)
            .Match<Account>(() => account, a => a.Owner == customer, a => a.IsActive);

        Then()
            .Do(ctx => customer.DoSomething());
    }
}
```

## 存在规则

存在规则测试是否存在符合特定条件的事实。使用`Exists`方法定义存在限定符。 存在限定符不能绑定到变量，因为它不匹配任何单个事实。

```csharp
public class PreferredCustomerActiveAccountsRule : Rule
{
    public override void Define()
    {
        Customer customer = null;

        When()
            .Match<Customer>(() => customer, c => c.IsPreferred)
            .Exists<Account>(a => a.Owner == customer, a => a.IsActive);

        Then()
            .Do(ctx => customer.DoSomething());
    }
}
```

## 否定规则

与存在规则相反，否定规则测试缺少与特定条件相匹配的事实。 使用`Not`方法定义负存在限定符。负存在限定符不能绑定到变量，因为它不匹配任何单个事实。

```csharp
public class PreferredCustomerNotDelinquentRule : Rule
{
    public override void Define()
    {
        Customer customer = null;

        When()
            .Match<Customer>(() => customer, c => c.IsPreferred)
            .Not<Account>(a => a.Owner == customer, a => a.IsDelinquent);

        Then()
            .Do(ctx => customer.DoSomething());
    }
}
```

## 通用限定符

通用限定符确保匹配特定条件的所有事实，也匹配限定符定义的所有后续条件。使用`All`方法定义通用限定符。通用限定符不能绑定到变量，因为它不匹配任何单个事实。

```csharp
public class PreferredCustomerAllAccountsActiveRule : Rule
{
    public override void Define()
    {
        Customer customer = null;

        When()
            .Match<Customer>(() => customer, c => c.IsPreferred)
            .All<Account>(a => a.Owner == customer, a => a.IsActive);

        Then()
            .Do(ctx => customer.DoSomething());
    }
}
```

## 分组模式

默认情况下，规则左侧的所有模式都使用 AND 运算符进行连接。这意味着所有模式必须匹配才能激活规则。模式也可以使用 OR 运算符连接，也可以组合到嵌套组中。

```csharp
public class PreferredCustomerOrHasLargeOrderRule : Rule
{
    public override void Define()
    {
        Customer customer = null;

        When()
            .Or(x => x
                .Match<Customer>(() => customer, c => c.IsPreferred)
                .And(xx => xx
                    .Match<Customer>(() => customer, c => !c.IsPreferred)
                    .Exists<Order>(o => o.Customer == customer, o => o.Price >= 1000.00)));

        Then()
            .Do(ctx => customer.DoSomething());
    }
}
```

## 复杂逻辑的规则

在复杂的规则中，通常需要聚合或预测事实，计算派生值并关联不同的匹配事实。规则引擎提供了几种不同的 DSL 运算符来表达这种逻辑。

规则可以使用`Query`语法匹配和转换事实集，使规则作者能够将 LINQ 运算符应用于匹配的事实；有关更多详细信息，请参阅 [响应式 LINQ 查询](/wiki/reactive-linq-queries.html)。

`Let`运算符将表达式绑定到变量，以便该表达式的结果可用于后续规则条件和执行。

此外，`Having`运算符可以为先前匹配的事实添加新条件，包括计算值、改善规则表达性和可合成性。

```csharp
public class LargeTotalRule : Rule
{
    public override void Define()
    {
        Customer customer = null;
        IEnumerable<Order> orders = null;
        double total = 0;

        When()
            .Match<Customer>(() => customer, c => c.IsPreferred)
            .Query(() => orders, x => x
                .Match<Order>(
                    o => o.Customer == customer,
                    o => o.IsOpen)
                .Collect())
            .Let(() => total, () => orders.Sum(x => x.Amount))
            .Having(() => total > 100);

        Then()
            .Do(ctx => customer.DoSomething(total));
    }
}
```