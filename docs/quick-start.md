# 快速入门

本指南逐步介绍如何安装和使用 NRules 规则引擎。

## 安装 NRules

创建一个新的 Visual Studio 项目并通过`程序包管理器控制台`安装 NRules 包

```
PM> Install-Package NRules
```

## 创建领域模型

NRules 适用于针对领域模型编写规则，因此我们首先创建一个描述客户和订单的简单规则。在此示例中，我们在名为`Domain`的单独 Visual Studio 项目中创建此模型。

```csharp
public class Customer
{
    public string Name { get; private set; }
    public bool IsPreferred { get; set; }

    public Customer(string name)
    {
        Name = name;
    }

    public void NotifyAboutDiscount()
    {
        Console.WriteLine("客户{0}收到有关折扣的通知", Name);
    }
}

public class Order
{
    public int Id { get; private set; }
    public Customer Customer { get; private set; }
    public int Quantity { get; private set; }
    public double UnitPrice { get; private set; }
    public double PercentDiscount { get; private set; }
    public bool IsDiscounted { get { return PercentDiscount > 0; } }

    public double Price
    {
        get { return UnitPrice*Quantity*(1.0 - PercentDiscount/100.0); }
    }

    public Order(int id, Customer customer, int quantity, double unitPrice)
    {
        Id = id;
        Customer = customer;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    public void ApplyDiscount(double percentDiscount)
    {
        PercentDiscount = percentDiscount;
    }
}
```

## 创建规则

使用 NRules 内部 DSL 时，规则是继承自 NRules.Fluent.Dsl.Rule 的类。规则由一组条件（与规则引擎的内存中的事实匹配的模式）和引擎在规则触发时一组执行动作组成。 在此示例中，我们在名为`Rules`的单独 Visual Studio 项目中创建规则，该项目依赖于`Domain`模型项目。

让我们来看第一条规则。我们希望找到所有首选客户，并且对于每个匹配的客户，我们希望收集所有订单并应用 10％ 的折扣。 规则的 When 部分中的每个模式通过表达式绑定到变量，然后可以在规则的 Then 部分中使用。 另请注意，如果规则中有多个模式，则必须关联模式以避免匹配事实之间的笛卡尔积。在此示例中，订单与客户关联。

```csharp
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
            .Do(ctx => ApplyDiscount(orders, 10.0))
            .Do(ctx => ctx.UpdateAll(orders));
    }

    private static void ApplyDiscount(IEnumerable<Order> orders, double discount)
    {
        foreach (var order in orders)
        {
            order.ApplyDiscount(discount);
        }
    }
}
```

第二条规则将查找具有折扣订单的所有客户，并将通知他们折扣。有趣的是，此规则依赖于已触发的第一个规则。换句话说，第一个规则触发并更新规则引擎的内存，触发第二个规则。这是执行上的前向链（forward chaining）。

```csharp
public class DiscountNotificationRule : Rule
{
    public override void Define()
    {
        Customer customer = null;

        When()
            .Match<Customer>(() => customer)
            .Exists<Order>(o => o.Customer == customer, o => o.PercentDiscount > 0.0);

        Then()
            .Do(_ => customer.NotifyAboutDiscount());
    }
}
```

## 运行规则

NRules 是一个推理引擎。这意味着没有执行规则的预定义顺序，并且它会运行一个匹配/解析/执行周期来计算出来。它首先将事实（我们案例中的域实体实例）与规则进行匹配，并确定可以触发的规则。然后，它通过选择实际触发的单个规则来解决冲突。最后，它通过执行所选规则的动作来触发所选规则。循环重复，直到没有更多的规则要触发。我们需要为引擎做几件事来进入匹配/解析/执行周期。首先，我们需要加载规则并将其编译到内部结构（Rete网络），以便引擎知道规则是什么，并能有效地匹配事实。为此，我们创建了一个规则存储库，并允许它扫描程序集来查找规则类。然后，我们将规则编译到会话工厂。接下来，我们需要使用引擎创建一个工作会话，并将事实插入引擎的内存中。最后，我们告诉引擎启动匹配/解析/执行周期。

```csharp
//Load rules
var repository = new RuleRepository();
repository.Load(x => x.From(typeof(PreferredCustomerDiscountRule).Assembly));

//Compile rules
var factory = repository.Compile();

//Create a working session
var session = factory.CreateSession();
            
//Load domain model
var customer = new Customer("John Doe") {IsPreferred = true};
var order1 = new Order(123456, customer, 2, 25.0);
var order2 = new Order(123457, customer, 1, 100.0);

//Insert facts into rules engine's memory
session.Insert(customer);
session.Insert(order1);
session.Insert(order2);

//Start match/resolve/act cycle
session.Fire();
```