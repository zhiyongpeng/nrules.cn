# 规则生成器

如[架构](/wiki/architecture.html)页中所述，规则以几种不同的形式在 NRules 中表示。 其中一种形式是规范模型（规则模型），可以编译到可执行模型中。

在 NRules 中创建规则的标准方法是使用流式 API 使用内部 DSL，这要求在编译时知道规则。但这不是创建规则的唯一方法。规则生成器是专门为在运行时创建规则而设计的组件，实际上是流式 API 背后的基础机制。 `RuleBuilder`类和相关类驻留在`NRules.RuleModel`命名空间中。

>**注意** 与流式 API 不同，规范模型和规则生成器不是强类型的，因此您需要确保类型安全性和正确性（否则将面对运行时错误）。

在运行时生成规则时，需要一个位置存储这些规则。 此类存储由`IRuleRepository`接口表示，因此您需要实现它才从用户定义的源加载规则。 规则存储库是一个内存中的规则定义数据库，组织成规则集（`IRuleSet`），封装了以任何形式将规则转换为规范模型的过程。

```csharp
public class CustomRuleRepository : IRuleRepository
{
    private readonly IRuleSet _ruleSet = new RuleSet("MyRuleSet");

    public IEnumerable<IRuleSet> GetRuleSets()
    {
        return new[] {_ruleSet};
    }

    public void LoadRules()
    {
        //Assuming there is only one rule in this example
        var rule = BuildRule();
        _ruleSet.Add(new []{rule});
    }

    private IRuleDefinition BuildRule()
    {
        //...
    }
}
```

我们将使用一个简单精心设计的领域来作为自定义规则。

```csharp
public class Customer
{
    public Customer(string name)
    {
        Name = name;
    }

    public string Name { get; private set; }
}

public class Order
{
    public Order(Customer customer, decimal amount)
    {
        Customer = customer;
        Amount = amount;
    }

    public Customer Customer { get; private set; }
    public decimal Amount { get; private set; }
}
```
现在，让我们实现`CustomRuleRepository.BuildRule`方法。 我们将创建以下规则：

> **名称** TestRule
> **如果**
> - 客户名是 John Do
> - 并且该客户的订单金额 > $100
> 
> **那么**
> - 打印客户姓名和订单金额

以下是代码：

```csharp
private IRuleDefinition BuildRule()
{
    //创建规则生成器
    var builder = new RuleBuilder();
    builder.Name("TestRule");

    //生成条件
    PatternBuilder customerPattern = builder.LeftHandSide().Pattern(typeof (Customer), "customer");
    Expression<Func<Customer, bool>> customerCondition = 
        customer => customer.Name == "John Do";
    customerPattern.Condition(customerCondition);

    PatternBuilder orderPattern = builder.LeftHandSide().Pattern(typeof (Order), "order");
    Expression<Func<Order, Customer, bool>> orderCondition1 = 
        (order, customer) => order.Customer == customer;
    Expression<Func<Order, bool>> orderCondition2 = 
        order => order.Amount > 100.00m;
    orderPattern.Condition(orderCondition1);
    orderPattern.Condition(orderCondition2);

    //生成动作
    Expression<Action<IContext, Customer, Order>> action = 
        (ctx, customer, order) => Console.WriteLine("Customer {0} has an order in amount of ${1}", customer.Name, order.Amount);
    builder.RightHandSide().Action(action);

    //生成规则模型
    return builder.Build();
}
```
关于规则生成器代码的一些说明。

- 条件表达式只能引用与先前已定义的模式（使用`Pattern`方法）相对应的参数。
- Lambda 表达式参数的名称和类型很重要，并且必须与模式中定义的名称和类型相匹配。
- Aaction 表达式的第一个参数必须是`IContext`类型。您可以使用`IContext`与引擎交互（即插入新事实）。
- Lambda 表达式不必在编译时定义。 在BCL的`Expression`类上使用各种静态方法在运行时组合表达式树。

把这些放在一起，以下是测试代码。

```csharp
var repository = new CustomRuleRepository();
repository.LoadRules();
ISessionFactory factory = repository.Compile();

ISession session = factory.CreateSession();
var customer = new Customer("John Do");
session.Insert(customer);
session.Insert(new Order(customer, 90.00m));
session.Insert(new Order(customer, 110.00m));

session.Fire();
```