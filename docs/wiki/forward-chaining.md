# 前向链（Forward Chaining）

NRules 中的规则由一组条件和一组动作组成。当规则匹配一组事实（事实满足规则的所有条件）时，则规则被激活。 如果它是激活的最高优先级规则，则触发规则，并执行其动作。 这些规则不限于仅匹配于引擎外部插入引擎内存的事实。 规则本身可以产生新的事实（或改变现有事实），然后触发其他规则。导致另一个规则触发的一个规则的过程称为前向链。

前向链在业务逻辑的分解中很有用，其中复杂的逻辑部分被分解为正交规则，并且前向链事实充当它们之间的接口。 此方法的示例包括封装业务概念或现有事实的新指标的计算规则，以及使用该概念/指标而不考虑其生成方式的其他规则。

规则可以使用引擎传递给它们的`IContext`参数，从执行中与规则引擎交互。特别是，规则的执行可以插入新事实并更新或撤回现有事实。 当规则创建新事实时，它有两种方式可以实现 - 插入独立事实或插入链接事实。

当规则插入新的独立事实时，该事实继续将存在于引擎中，直到它被明确收回，即使生成它的规则的条件变为`false`。 使用`Insert`、`InsertAll`或`TryInsert`方法将这些事实插入到规则引擎中。

该规则还可以创建一个链接的事实，只要产生它的规则仍然成立，该事实才会保留在引擎的内存中。 如果创建链接事实的规则不再有效，则链接的事实将自动收回。 使用`InsertLinked`方法将链接的事实插入到规则引擎中。 虽然可以通过直接调用`IContext`上的方法，来管理独立的前向链事实，但使用流式 DSL 方法管理链接的事实要容易得多。

## 流式前向链

NRules Fluent DSL 简化了链接事实的创建，以支持前向链。它还会自动将链接的事实与生成它们的规则保持同步。 规则可以使用`Yield`来生成链接的事实，而不是使用`Do`动作。如果这是给定匹配事实集的规则的第一次激活，则创建新的链接事实。 如果这是规则的后续激活（即由于对匹配事实的更新），相应的链接事实也会更新。 最后，如果规则不再匹配，则会自动收回相应的链接事实。 `Yield`方法有两个重载 - 一个与插入和更新相同的计算，另一个使有不同的计算 - 在后一种情况下，更新可以访问链接事实的上一个值。

```csharp
public class PreferredCustomerDiscountRule : Rule
{
    public override void Define()
    {
        Customer customer = null;
        IEnumerable<Order> orders = null;
        Double total = Double.NaN;

        When()
            .Match<Customer>(() => customer, c => c.IsPreferred)
            .Query(() => orders, x => x
                .Match<Order>(
                    o => o.Customer == customer,
                    o => o.IsOpen)
                .Collect())
            .Let(() => total, () => orders.Sum(x => x.Amount))
            .Having(() => total > 1000);

        Then()
            .Yield(_ => new InstantDiscount(customer, total * 0.05));
    }
}

public class PrintInstantDiscountRule : Rule
{
    public override void Define()
    {
        InstantDiscount discount = null;

        When()
            .Match(() => discount);

        Then()
            .Do(_ => Console.WriteLine("Customer {0} has instant discount of {1}", 
                discount.Customer.Name, discount.Amount));
    }
}
```