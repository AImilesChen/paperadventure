// Source-owned explanations only. Player names and generated stories stay raw.
export function sudokuHelpCopy(value,locale='en'){
 if(locale!=='zh'||typeof value!=='string')return value;
 const unit=s=>s.replace(/row ([A-I1-9])/g,'第 $1 行').replace(/column (\d)/g,'第 $1 列').replace(/box (\d)/g,'第 $1 宫');
 const patterns=[
  [/Row ([A-I]) is missing ([\d, ]+)\. At (\w+), cross out digits already in column (\d) or its 3×3 box\./g,(_,r,n,c,col)=>`第 ${r} 行缺少 ${n}。检查 ${c}，排除第 ${col} 列及所在九宫格中已出现的数字。`],
  [/Revisit the number you entered at (\w+) \(row ([A-I]), column (\d)\)\. Check the row, column and 3×3 box again\. An entry can be incorrect even when no red duplicate is shown\./g,(_,c,r,col)=>`重新检查你在 ${c}（第 ${r} 行、第 ${col} 列）填入的数字。再次核对所在行、列和九宫格。即使没有红色重复标记，填入的数字也可能不正确。`],
  [/Replace the entry at (\w+) with (\d)\. This is the verified value in this puzzle's unique solution\. If a nearby entry now creates a duplicate, review that entry next\./g,(_,c,d)=>`将 ${c} 改为 ${d}。这是本题唯一解中已验证的数字。如果附近其他填入的数字因此出现重复，请继续检查那一格。`],
  [/The verified next entry at (\w+) is (\d)\. It belongs to this puzzle's unique solution; check its row, column and 3×3 box as you continue\./g,(_,c,d)=>`${c} 的已验证答案是 ${d}，来自本题的唯一解。继续核对所在行、列和九宫格。`],
  [/(\w+) has only one candidate: (\d)\. The other digits already occur in its row, column or box\./g,(_,c,d)=>`${c} 只剩一个候选数：${d}。其他数字都已在它所在的行、列或宫中出现。`],
  [/In (row \w+|column \d+|box \d+), (\d) can appear only at (\w+)\. All other empty cells in this unit exclude (\d)\./g,(_,u,d,c)=>`在${unit(u)}中，${d} 只能填入 ${c}。这一组的其他空格均已排除该数字。`],
  [/In (row \w+|column \d+|box \d+), all possible (\d)s lie in (row \w+|column \d+|box \d+)\. Remove (\d) from ([A-I0-9, ]+) outside that box\./g,(_,u,d,line,n,c)=>`在${unit(u)}中，${d} 的所有可能位置都位于${unit(line)}。因此可以从该宫之外的 ${c} 中删除候选数 ${n}。`],
  [/([A-I0-9 and]+) share exactly ([\d and]+) in (row \w+|column \d+|box \d+)\. Those digits must occupy these two cells, so remove them from the other cells in this unit\./g,(_,cells,ds,u)=>`${cells.replaceAll(' and ',' 和 ')} 在${unit(u)}中恰好具有相同的两个候选数 ${ds.replaceAll(' and ',' 和 ')}。这两个数字必然占据这两格，因此可以从同组的其他格中删除它们。`],
 ];
 for(const [pattern,replacement] of patterns)value=value.replace(pattern,replacement);
 return value;
}
