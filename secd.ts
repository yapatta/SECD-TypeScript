(() => {
  const ENTER_KEY = 13;

  interface ArrayConstructor {
    from(arrayLike: any, mapFn?, thisArg?): Array<any>;
  }
  // State of SECD Machine
  interface SECD {
    S: Array<any>;
    E: Object;
    C: Array<any>;
    D: Array<SECD>;
  }

  type Lambda = App | Func | Var;

  // Application
  interface App {
    func: Lambda;
    var: Lambda;
  }

  // Variable
  interface Var {
    name: string;
    val: number;
  }

  // Abstraction
  interface Func {
    arg: Var;
    body: Lambda;
  }

  // Closure
  interface Closure {
    func: Func;
    env: Object;
  }

  const MySecd = () => {
    const id = 1;
    const txtInput = <HTMLInputElement>document.getElementById("txtInput");
    const divResults = document.getElementById("divResults");

    const codeDetails = {
      author: "Yujiro Yahata",
      course: "Computational Model Theory",
      sem: "Spring 2020",
      date: "31th August, 2020",
      college: "Keio University",
    };

    const DomOperations = () => {
      txtInput.onkeypress = (e: KeyboardEvent) => {
        if (e.keyCode === ENTER_KEY) {
          console.log("--- Begin SECD ---");
          console.log(txtInput.value);
          const code = parseCode(txtInput.value);
          const result = executeSECD(code, {});
          divResults.innerHTML = result;
          console.log("--- End SECD ---");
        }
      };
    };

    // ex: app:{func:{arg:'x',body:'x'},var:{name:'a',val:3}}

    const parseCode = (inputCode: string): object => {
      console.log("input val: ", inputCode);
      const strAst = "return {" + inputCode + "};";
      const astObject = <object>Function(strAst)();

      console.log("input ast: ", astObject);

      return astObject;
    };

    const executeSECD = (code: any, env: Object): string => {
      let secd: SECD = { S: new Array(), E: env, C: [code], D: new Array() };

      while (
        !(
          secd.S.length === 1 &&
          Object.keys(secd.E).length === 0 &&
          secd.C.length === 0 &&
          secd.D.length === 0
        )
      ) {
        while (secd.C.length) {
          // define2: if head C is variable
          if (secd.C[secd.C.length - 1].var !== undefined) {
            console.log("Def2");
            secd = executeDefTwo(secd);
          } else if (secd.C[secd.C.length - 1].func !== undefined) {
            console.log("Def3");
            secd = executeDefThree(secd);
          } else if (secd.C[secd.C.length - 1] === "ap") {
            if (secd.S[secd.S.length - 1].closure !== undefined) {
              console.log("Def4");
              secd = executeDefFour(secd);
            } else {
              console.log("Def5");
              secd = executeDefFive(secd);
            }
          } else {
            console.log("Def6");
            secd = executeDefSix(secd);
          }

          secdLogger(secd);
        }
        // C is Empty
        // Define1: (S, E, [], (S1, E1, C1, D1)) -> (S.pop():S1, E1, C1, D1)
        while (secd.D.length) {
          console.log("Def1");
          secd = executeDefOne(secd);
          secdLogger(secd);
        }
      }

      return JSON.stringify(secd.S.pop());
    };

    // (S, E, C, D) -> (hs:S', E', C, D')
    // where S', E', C, D' = D
    const executeDefOne = (secd: SECD): SECD => {
      const d = secd.D.pop();
      const newS = Array.from(d.S);
      const newE = Object.create(d.E);
      const newC = Object.create(d.C);
      const newD = Array.from(d.D);

      // 次の状態でもうsecd.Sは関係ない
      newS.push(secd.S.pop());

      return { S: newS, E: newE, C: newC, D: newD } as SECD;
    };

    // hd C is variable
    // (location EXE:S, E, tC, D)
    const executeDefTwo = (secd: SECD): SECD => {
      const newS = Array.from(secd.S);
      const newE = Object.create(secd.E);
      const newD = Array.from(secd.D);

      // S -> location EXE:S
      // C -> tl C
      // ex: headC = {var: {name: 'a', val: 2}}
      const headC = secd.C.pop();
      const newC = Array.from(secd.C);

      if (headC.var.name in secd.E) {
        const newHeadC = { var: secd.E[headC.var.name] };
        newS.push(newHeadC);
      } else {
        newS.push(headC);
      }

      return { S: newS, E: newE, C: newC, D: newD } as SECD;
    };

    // hd C is lambda expression
    const executeDefThree = (secd: SECD): SECD => {
      const newS = Array.from(secd.S);
      const newE = Object.create(secd.E);
      const newD = Array.from(secd.D);

      // C -> tl C
      // ex: headC = {func: {arg: 'x', body: 'x'}}
      const headC = secd.C.pop();
      const newC = Array.from(secd.C);

      // closureをpush: {func, env}
      newS.push({
        closure: {
          func: { ...headC.func },
          env: { ...secd.E },
        },
      });

      return { S: newS, E: newE, C: newC, D: newD } as SECD;
    };

    // hd Cが'ap'かつhd Sが環境E1っと束縛変数bv Xとを持ったclosureのとき
    const executeDefFour = (secd: SECD): SECD => {
      // ex: firstS = {closure: {func: {arg: 'x', body: 'x'}, env: {}}
      const firstS = secd.S.pop();

      const e1 = Object.create(firstS.closure.env);
      const arg = firstS.closure.func.arg;
      const body = firstS.closure.func.body;

      // derive(assoc(bv X, 2nd S)) :E1
      // ex: secondS = {var: {name: 'a', val: 2}}
      const secondS = secd.S.pop();
      const newE = Object.create(e1);
      newE[arg] = secondS.var;

      secd.C.pop();

      const newS = [];
      const newC =
        typeof body === "string"
          ? [{ var: { name: body, val: undefined } }]
          : [{ ...body }];
      const newD = [
        <SECD>{
          S: Array.from(secd.S),
          E: Object.create(secd.E),
          C: Array.from(secd.C),
          D: Array.from(secd.D),
        },
      ];

      return { S: newS, E: newE, C: newC, D: newD } as SECD;
    };

    // hd Cが記号'ap'かつhd Sがclosureでないとき
    // (S, E, C, D) -> (((1st S)(2nd S):tl(tl S)), E, tl C, D)
    const executeDefFive = (secd: SECD): SECD => {
      // ((1st S)(2nd S):tl(tl S))ってSと変わんなくね
      const newS = Array.from(secd.S);
      const newE = Object.create(secd.E);
      secd.C.pop();
      const newC = Array.from(secd.C);
      const newD = Array.from(secd.D);

      return { S: newS, E: newE, C: newC, D: newD } as SECD;
    };

    const executeDefSix = (secd: SECD): SECD => {
      const newS = Array.from(secd.S);
      const newE = Object.create(secd.E);
      const newD = Array.from(secd.D);

      // ex: headC = {app: {func: {}, var: {}}}
      const headC = secd.C.pop();
      secd.C.push("ap");

      if (headC.app.func !== undefined) {
        secd.C.push({ func: headC.app.func });
      } else if (headC.app.app !== undefined) {
        secd.C.push({ app: headC.app.app });
      }

      secd.C.push({ var: headC.app.var });

      const newC = Array.from(secd.C);

      return { S: newS, E: newE, C: newC, D: newD } as SECD;
    };

    const secdLogger = (secd: SECD) => {
      console.log("------ SECD Logger Start ------");

      // S
      console.log("--- S Start ---");
      secd.S.forEach((element, index) => console.log(JSON.stringify(element)));
      console.log("--- S End ---");

      // E
      console.log("--- E Start ---");
      console.log(JSON.stringify(secd.E));
      console.log("--- E End ---");

      // C
      console.log("--- C Start ---");
      secd.C.forEach((element, index) => console.log(JSON.stringify(element)));
      console.log("--- C End ---");

      // D
      console.log("--- D Start ---");
      secd.D.forEach((element, index) => console.log(JSON.stringify(element)));
      console.log("--- D End ---");

      console.log("------ SECD Logger End ------");
    };

    return {
      init: DomOperations,
      credit: codeDetails,
    };
  };

  window.onload = () => {
    const secd = MySecd();
    secd.init();
    console.log(secd.credit);
  };
})();
