using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IndigoERP.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseEmployeeNav : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Expenses_EmployeeId",
                table: "Expenses",
                column: "EmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Employees_EmployeeId",
                table: "Expenses",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_Employees_EmployeeId",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_EmployeeId",
                table: "Expenses");
        }
    }
}
