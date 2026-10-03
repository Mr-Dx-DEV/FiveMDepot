<?php
/**
 * FiveMDepot — Database (PDO, prepared statements only)
 */

require_once __DIR__ . '/../config.php';

final class Db
{
  private static ?PDO $pdo = null;

  public static function pdo(): PDO
  {
    if (self::$pdo === null) {
      // DB_HOST may be "host" or "host:port"
      $parts = explode(':', DB_HOST, 2);
      $dsn = 'mysql:host=' . $parts[0]
        . (isset($parts[1]) ? ';port=' . (int)$parts[1] : '')
        . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;

      self::$pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
      ]);
    }
    return self::$pdo;
  }

  /** Run a query and return all rows. */
  public static function all(string $sql, array $params = []): array
  {
    $stmt = self::pdo()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
  }

  /** Run a query and return the first row or null. */
  public static function one(string $sql, array $params = []): ?array
  {
    $stmt = self::pdo()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
  }

  /** Run a query and return the first column of the first row. */
  public static function value(string $sql, array $params = [])
  {
    $stmt = self::pdo()->prepare($sql);
    $stmt->execute($params);
    $v = $stmt->fetchColumn();
    return $v === false ? null : $v;
  }

  /** Build "?, ?, ?" for an IN (...) list. */
  public static function in(array $values): string
  {
    return implode(', ', array_fill(0, max(1, count($values)), '?'));
  }
}

/** Decode a JSON column into an array ([] for NULL/invalid). */
function json_col($v): array
{
  if (is_array($v)) return $v;
  $d = json_decode((string)$v, true);
  return is_array($d) ? $d : [];
}
